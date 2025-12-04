import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

// Default timeout: 30 minutes of inactivity
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
// Warning before logout: 2 minutes
const WARNING_BEFORE_TIMEOUT_MS = 2 * 60 * 1000;

interface UseSessionTimeoutOptions {
  timeoutMs?: number;
  warningMs?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
  enabled?: boolean;
}

export const useSessionTimeout = (options: UseSessionTimeoutOptions = {}) => {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    warningMs = WARNING_BEFORE_TIMEOUT_MS,
    onTimeout,
    onWarning,
    enabled = true,
  } = options;

  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(async () => {
    console.log('[SessionTimeout] Session timed out due to inactivity');
    
    // Clear session storage flags
    sessionStorage.removeItem('2fa_verified');
    sessionStorage.removeItem('admin_2fa_verified');
    
    // Sign out
    await supabase.auth.signOut();
    
    toast({
      title: 'Sessão Expirada',
      description: 'Sua sessão foi encerrada por inatividade. Por favor, faça login novamente.',
      variant: 'destructive',
    });
    
    if (onTimeout) {
      onTimeout();
    }
    
    navigate('/auth');
  }, [navigate, onTimeout]);

  const handleWarning = useCallback(() => {
    if (warningShownRef.current) return;
    
    warningShownRef.current = true;
    console.log('[SessionTimeout] Warning: Session will expire soon');
    
    toast({
      title: 'Sessão Expirando',
      description: `Sua sessão irá expirar em ${Math.round(warningMs / 60000)} minutos por inatividade. Mova o mouse ou pressione uma tecla para continuar.`,
      duration: warningMs,
    });
    
    if (onWarning) {
      onWarning();
    }
  }, [warningMs, onWarning]);

  const resetTimers = useCallback(() => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    clearTimers();

    // Set warning timer
    const warningTime = timeoutMs - warningMs;
    if (warningTime > 0) {
      warningRef.current = setTimeout(handleWarning, warningTime);
    }

    // Set timeout timer
    timeoutRef.current = setTimeout(handleTimeout, timeoutMs);
  }, [enabled, timeoutMs, warningMs, clearTimers, handleWarning, handleTimeout]);

  const handleActivity = useCallback(() => {
    // Only reset if user was warned or if significant time has passed
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    
    if (warningShownRef.current || timeSinceLastActivity > 60000) { // Reset if warned or after 1 minute
      resetTimers();
    }
  }, [resetTimers]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !enabled) {
        clearTimers();
        return;
      }
      
      resetTimers();
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        resetTimers();
      } else if (event === 'SIGNED_OUT') {
        clearTimers();
      }
    });

    // Activity listeners
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      subscription.unsubscribe();
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimers, clearTimers, handleActivity]);

  return {
    resetTimers,
    clearTimers,
    getLastActivity: () => lastActivityRef.current,
    getRemainingTime: () => {
      const elapsed = Date.now() - lastActivityRef.current;
      return Math.max(0, timeoutMs - elapsed);
    },
  };
};

export default useSessionTimeout;
