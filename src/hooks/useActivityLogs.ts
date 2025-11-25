import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 
  | 'login' 
  | 'login_failed' 
  | 'password_changed' 
  | 'mfa_enabled' 
  | 'mfa_disabled' 
  | 'logout'
  | 'profile_updated'
  | 'address_added'
  | 'address_updated'
  | 'address_deleted'
  | 'order_created'
  | 'order_cancelled'
  | 'review_created'
  | 'review_updated'
  | 'review_deleted'
  | 'admin_product_created'
  | 'admin_product_updated'
  | 'admin_product_deleted'
  | 'admin_order_status_changed'
  | 'admin_settings_changed'
  | 'sensitive_data_accessed'
  | 'unauthorized_access_attempt';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
  before_data?: any;
  after_data?: any;
  resource_type?: string | null;
  resource_id?: string | null;
  severity?: AuditSeverity;
  session_id?: string | null;
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

export interface AuditLogOptions {
  metadata?: any;
  beforeData?: any;
  afterData?: any;
  resourceType?: string;
  resourceId?: string;
  severity?: AuditSeverity;
}

export const logActivity = async (
  activityType: ActivityType,
  options?: AuditLogOptions
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: { session } } = await supabase.auth.getSession();
    const userAgent = navigator.userAgent;

    // Use edge function for asynchronous logging to avoid blocking
    await supabase.functions.invoke('audit-log', {
      body: {
        userId: user.id,
        activityType,
        userAgent,
        metadata: options?.metadata || {},
        beforeData: options?.beforeData,
        afterData: options?.afterData,
        resourceType: options?.resourceType,
        resourceId: options?.resourceId,
        severity: options?.severity || 'info',
        sessionId: session?.access_token ? session.access_token.substring(0, 20) : null,
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
