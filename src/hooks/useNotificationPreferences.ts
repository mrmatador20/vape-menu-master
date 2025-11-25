import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface NotificationPreferences {
  id?: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  notify_failed_login: boolean;
  notify_suspicious_login: boolean;
  notify_password_change: boolean;
  notify_admin_actions: boolean;
  notify_account_locked: boolean;
}

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Return default preferences if none exist
      if (!data) {
        return {
          user_id: user.id,
          email_enabled: true,
          sms_enabled: false,
          notify_failed_login: true,
          notify_suspicious_login: true,
          notify_password_change: true,
          notify_admin_actions: true,
          notify_account_locked: true,
        } as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          ...prefs,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast({
        title: 'Preferências atualizadas',
        description: 'Suas preferências de notificação foram salvas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar preferências',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
