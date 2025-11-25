import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SecurityMetrics {
  loginAttempts: {
    total: number;
    failed: number;
    successful: number;
    trend: Array<{ hour: string; failed: number; successful: number }>;
  };
  blockedIPs: Array<{
    identifier: string;
    attempt_count: number;
    block_expires_at: string | null;
    action_type: string;
  }>;
  criticalActions: Array<{
    id: string;
    user_id: string;
    activity_type: string;
    severity: string;
    created_at: string;
    metadata: any;
  }>;
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    details: any;
  }>;
  securityScore: number;
}

export const useSecurityMetrics = () => {
  return useQuery({
    queryKey: ['security-metrics'],
    queryFn: async (): Promise<SecurityMetrics> => {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get login attempts from last 24h
      const { data: loginLogs, error: loginError } = await supabase
        .from('user_activity_logs')
        .select('*')
        .in('activity_type', ['login', 'login_failed'])
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false });

      if (loginError) throw loginError;

      // Get blocked IPs
      const { data: blockedIPs, error: blockedError } = await supabase
        .from('rate_limit_tracking')
        .select('*')
        .eq('is_blocked', true)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (blockedError) throw blockedError;

      // Get critical actions from last 7 days
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: criticalActions, error: criticalError } = await supabase
        .from('user_activity_logs')
        .select('*')
        .in('severity', ['warning', 'critical'])
        .gte('created_at', last7Days.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (criticalError) throw criticalError;

      // Calculate trends by hour
      const hourlyTrends: Record<string, { failed: number; successful: number }> = {};
      loginLogs?.forEach((log) => {
        const hour = new Date(log.created_at).getHours();
        const hourKey = `${hour}:00`;
        if (!hourlyTrends[hourKey]) {
          hourlyTrends[hourKey] = { failed: 0, successful: 0 };
        }
        if (log.activity_type === 'login_failed') {
          hourlyTrends[hourKey].failed++;
        } else {
          hourlyTrends[hourKey].successful++;
        }
      });

      const trend = Object.entries(hourlyTrends)
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

      // Call anomaly detection edge function
      const { data: anomalyData } = await supabase.functions.invoke('detect-anomalies', {
        body: { loginLogs, criticalActions, blockedIPs }
      });

      const anomalies = anomalyData?.anomalies || [];

      // Calculate security score (0-100)
      const failedLogins = loginLogs?.filter(l => l.activity_type === 'login_failed').length || 0;
      const totalLogins = loginLogs?.length || 1;
      const failureRate = failedLogins / totalLogins;
      const criticalCount = criticalActions?.filter(a => a.severity === 'critical').length || 0;
      const blockedCount = blockedIPs?.length || 0;
      const anomalyScore = anomalies.filter((a: any) => a.severity === 'critical').length;

      const securityScore = Math.max(0, Math.min(100, 
        100 - (failureRate * 30) - (criticalCount * 2) - (blockedCount * 1.5) - (anomalyScore * 5)
      ));

      return {
        loginAttempts: {
          total: loginLogs?.length || 0,
          failed: failedLogins,
          successful: (loginLogs?.length || 0) - failedLogins,
          trend,
        },
        blockedIPs: blockedIPs || [],
        criticalActions: criticalActions || [],
        anomalies,
        securityScore: Math.round(securityScore),
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
