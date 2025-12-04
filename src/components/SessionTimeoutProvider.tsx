import { useEffect, useState } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useSettingByKey } from '@/hooks/useSettings';

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
}

export const SessionTimeoutProvider = ({ children }: SessionTimeoutProviderProps) => {
  const { data: timeoutSetting } = useSettingByKey('session_timeout_minutes');
  const [timeoutMs, setTimeoutMs] = useState<number>(30 * 60 * 1000); // Default 30 minutes
  
  useEffect(() => {
    if (timeoutSetting?.value) {
      const minutes = parseInt(timeoutSetting.value, 10);
      if (!isNaN(minutes) && minutes > 0) {
        setTimeoutMs(minutes * 60 * 1000);
        console.log(`[SessionTimeout] Configured timeout: ${minutes} minutes`);
      }
    }
  }, [timeoutSetting]);
  
  // Use the session timeout hook
  useSessionTimeout({
    timeoutMs,
    warningMs: 2 * 60 * 1000, // 2 minutes warning
    enabled: true,
  });
  
  return <>{children}</>;
};

export default SessionTimeoutProvider;
