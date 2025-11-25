import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  phone_number: string | null;
  notify_suspicious_login: boolean;
  notify_failed_login: boolean;
  notify_password_change: boolean;
  notify_admin_actions: boolean;
  notify_account_locked: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No preferences found, create default ones
          const { data: newPrefs, error: insertError } = await supabase
            .from("notification_preferences")
            .insert({
              user_id: user.id,
              email_enabled: true,
              sms_enabled: false,
              notify_suspicious_login: true,
              notify_failed_login: true,
              notify_password_change: true,
              notify_admin_actions: true,
              notify_account_locked: true,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          return newPrefs as NotificationPreferences;
        }
        throw error;
      }

      return data as NotificationPreferences;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

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
      toast({
        title: "Preferências atualizadas",
        description: "Suas preferências de notificação foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating notification preferences:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar suas preferências. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
};
