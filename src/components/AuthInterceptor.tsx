import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/context/AuthStateContext';
import { Loader2 } from 'lucide-react';

interface AuthInterceptorProps {
  children: React.ReactNode;
}

/**
 * AuthInterceptor - Security component that validates session state
 * 
 * ARCHITECTURE:
 * - 2FA verification now happens on login screen (Auth.tsx)
 * - This component only validates session exists and 2FA was completed
 * - Redirects to login if session invalid or 2FA not verified
 */
export const AuthInterceptor = ({ children }: AuthInterceptorProps) => {
  const [interceptorState, setInterceptorState] = useState<'checking' | 'authenticated'>('checking');
  const { setAuthState: setGlobalAuthState } = useAuthState();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isCheckingRef = useRef(false);

  // Public routes that don't require authentication (browsing + cart are open to guests)
  const publicExact = ['/', '/auth', '/forgot-password', '/reset-password', '/cart', '/privacy-policy', '/terms-of-use'];
  const publicPrefixes = ['/c/', '/p/'];
  const isPublicRoute =
    publicExact.includes(location.pathname) ||
    publicPrefixes.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    let isMounted = true;

    const checkAuthentication = async () => {
      if (isCheckingRef.current) return;
      
      isCheckingRef.current = true;
      console.log('🛡️ AuthInterceptor: Checking session for route:', location.pathname);

      try {
        // Check if user has a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // If no session and trying to access protected route, redirect to login
        if ((sessionError || !session) && !isPublicRoute) {
          console.log('🛡️ AuthInterceptor: No session found, redirecting to login');
          if (isMounted) {
            navigate('/auth');
          }
          return;
        }

        // If no session and on public route, allow access
        if (!session && isPublicRoute) {
          console.log('🛡️ AuthInterceptor: No session, public route, allowing access');
          if (isMounted) {
            setGlobalAuthState('IDLE');
            setInterceptorState('authenticated');
          }
          return;
        }

        // Session exists - check if 2FA verification was completed on login screen
        let verified2FA = sessionStorage.getItem('2fa_verified') === 'true';

        // Persist across browser restarts: derive verification from real auth state.
        // If the session is already AAL2 (TOTP verified) or this device is trusted (≤30d),
        // restore the flag so the user does not need to log in again after closing the tab.
        if (!verified2FA) {
          try {
            const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            const isAAL2 = aalData?.currentLevel === 'aal2';

            let isTrustedDevice = false;
            if (!isAAL2) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                // Inline trusted-device check (mirrors useTrustedDevices fingerprint)
                const fp = (() => {
                  const s = [
                    navigator.userAgent,
                    navigator.language,
                    window.screen.colorDepth,
                    window.screen.width + 'x' + window.screen.height,
                    new Date().getTimezoneOffset(),
                    !!window.sessionStorage,
                    !!window.localStorage,
                  ].join('|');
                  let h = 0;
                  for (let i = 0; i < s.length; i++) {
                    h = ((h << 5) - h) + s.charCodeAt(i);
                    h = h & h;
                  }
                  return Math.abs(h).toString(36);
                })();

                const { data: device } = await supabase
                  .from('trusted_devices')
                  .select('id, last_used_at')
                  .eq('user_id', user.id)
                  .eq('device_fingerprint', fp)
                  .eq('is_trusted', true)
                  .maybeSingle();

                if (device) {
                  const days = (Date.now() - new Date(device.last_used_at).getTime()) / 86400000;
                  if (days <= 30) {
                    isTrustedDevice = true;
                    await supabase
                      .from('trusted_devices')
                      .update({ last_used_at: new Date().toISOString() })
                      .eq('id', device.id);
                  }
                }
              }
            }

            if (isAAL2 || isTrustedDevice) {
              sessionStorage.setItem('2fa_verified', 'true');
              verified2FA = true;
              console.log('🛡️ AuthInterceptor: Restored 2FA verification', { isAAL2, isTrustedDevice });
            }
          } catch (e) {
            console.error('🛡️ AuthInterceptor: Error restoring 2FA state:', e);
          }
        }

        if (!verified2FA && !isPublicRoute) {
          console.log('🛡️ AuthInterceptor: Session exists but 2FA not verified, redirecting to login');
          if (isMounted) {
            await supabase.auth.signOut();
            sessionStorage.removeItem('2fa_verified');
            navigate('/auth');
          }
          return;
        }

        // All checks passed
        console.log('🛡️ AuthInterceptor: Session valid and verified, allowing access');
        if (isMounted) {
          setGlobalAuthState('AUTHENTICATED');
          setInterceptorState('authenticated');
        }

      } catch (error) {
        console.error('🛡️ AuthInterceptor: Error during auth check:', error);
        if (isMounted) {
          await supabase.auth.signOut();
          navigate('/auth');
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkAuthentication();

    return () => {
      isMounted = false;
    };
  }, [location.pathname, isPublicRoute, navigate, setGlobalAuthState]);
  
  // Reset verification when user explicitly navigates to auth page
  useEffect(() => {
    if (location.pathname === '/auth') {
      sessionStorage.removeItem('2fa_verified');
      setInterceptorState('checking');
    }
  }, [location.pathname]);

  // Show loading state while checking
  if (interceptorState === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-hero">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando segurança...</p>
        </div>
      </div>
    );
  }

  // Authentication verified, render children
  return <>{children}</>;
};
