import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/context/AuthStateContext';
import { Loader2 } from 'lucide-react';
import { getMfaStatus } from '@/lib/mfaSession';

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

        // Session exists - always derive 2FA verification from server-side state
        // (AAL level or trusted device). NEVER trust sessionStorage as a gate, since
        // it can be set via DevTools to bypass 2FA enforcement.
        let verified2FA = false;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Server-derived: AAL2 (persists across F5 via JWT) OR trusted device
            const status = await getMfaStatus(user.id);
            verified2FA = status.satisfied;
            console.log('🛡️ AuthInterceptor: 2FA state', status);
          }
        } catch (e) {
          console.error('🛡️ AuthInterceptor: Error checking 2FA state:', e);
          verified2FA = false;
        }

        if (!verified2FA && !isPublicRoute) {
          console.log('🛡️ AuthInterceptor: Session exists but 2FA not verified, redirecting to login');
          if (isMounted) {
            const { secureSignOut } = await import('@/lib/secureLogout');
            await secureSignOut();
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
        // Erro transitório (rede/consulta) NÃO deve deslogar o usuário.
        console.error('🛡️ AuthInterceptor: Error during auth check:', error);
        if (isMounted) {
          setGlobalAuthState('AUTHENTICATED');
          setInterceptorState('authenticated');
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
