import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  notify_suspicious_login: boolean;
  notify_failed_auth: boolean;
  notify_admin_actions: boolean;
  notify_password_change: boolean;
  notify_account_locked: boolean;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();

  // Fetch notification preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Create default preferences if none exist
      if (error && error.code === 'PGRST116') {
        const { data: newPrefs, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            email_enabled: true,
            sms_enabled: false,
            notify_suspicious_login: true,
            notify_failed_auth: true,
            notify_admin_actions: true,
            notify_password_change: true,
            notify_account_locked: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as NotificationPreferences;
      }

      if (error) throw error;
      return data as NotificationPreferences;
    },
  });

  // Update notification preferences
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferências de notificação atualizadas com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar preferências: " + error.message);
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
};