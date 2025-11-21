import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 'login' | 'login_failed' | 'password_changed' | 'mfa_enabled' | 'mfa_disabled' | 'logout';

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

export const useActivityLogs = () => {
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  return {
    logs: logs || [],
    isLoading,
    refetch,
  };
};

export const logActivity = async (
  activityType: ActivityType,
  metadata?: any
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get client info
    const userAgent = navigator.userAgent;

    await supabase.from('user_activity_logs').insert({
      user_id: user.id,
      activity_type: activityType,
      user_agent: userAgent,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
