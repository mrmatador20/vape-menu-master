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

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth', '/forgot-password', '/reset-password', '/cart'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

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
        const verified2FA = sessionStorage.getItem('2fa_verified') === 'true';
        
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
