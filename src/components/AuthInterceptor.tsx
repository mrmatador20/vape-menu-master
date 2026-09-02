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

    // Rotas públicas não precisam de nenhuma verificação bloqueante.
    if (isPublicRoute) {
      setGlobalAuthState((prev) => prev);
      setInterceptorState('authenticated');
    }

    const checkAuthentication = async () => {
      if (isCheckingRef.current) return;
      
      isCheckingRef.current = true;

      try {
        // Sessão local (sem round-trip de rede)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // If no session and trying to access protected route, redirect to login
        if ((sessionError || !session) && !isPublicRoute) {
          if (isMounted) {
            navigate('/auth');
          }
          return;
        }

        // If no session and on public route, allow access
        if (!session && isPublicRoute) {
          if (isMounted) {
            setGlobalAuthState('IDLE');
            setInterceptorState('authenticated');
          }
          return;
        }

        // Session exists - always derive 2FA verification from server-side state
        // (AAL level or trusted device). NEVER trust sessionStorage as a gate.
        let verified2FA = false;
        try {
          const userId = session?.user?.id;
          if (userId) {
            const status = await getMfaStatus(userId);
            verified2FA = status.satisfied;
          }
        } catch (e) {
          console.error('🛡️ AuthInterceptor: Error checking 2FA state:', e);
          verified2FA = false;
        }

        if (!verified2FA && !isPublicRoute) {
          if (isMounted) {
            const { secureSignOut } = await import('@/lib/secureLogout');
            await secureSignOut();
            navigate('/auth');
          }
          return;
        }

        // All checks passed
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
