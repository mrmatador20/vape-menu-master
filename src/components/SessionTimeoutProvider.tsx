import { useEffect, useState } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useSettings } from '@/hooks/useSettings';

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
}

export const SessionTimeoutProvider = ({ children }: SessionTimeoutProviderProps) => {
  const { getSetting } = useSettings();
  const [timeoutMs, setTimeoutMs] = useState<number>(30 * 60 * 1000); // Default 30 minutes
  
  useEffect(() => {
    // Load session timeout from settings
    const loadSettings = async () => {
      try {
        const sessionTimeoutMinutes = await getSetting('session_timeout_minutes');
        if (sessionTimeoutMinutes) {
          const minutes = parseInt(sessionTimeoutMinutes, 10);
          if (!isNaN(minutes) && minutes > 0) {
            setTimeoutMs(minutes * 60 * 1000);
            console.log(`[SessionTimeout] Configured timeout: ${minutes} minutes`);
          }
        }
      } catch (error) {
        console.error('[SessionTimeout] Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, [getSetting]);
  
  // Use the session timeout hook
  useSessionTimeout({
    timeoutMs,
    warningMs: 2 * 60 * 1000, // 2 minutes warning
    enabled: true,
  });
  
  return <>{children}</>;
};

export default SessionTimeoutProvider;
