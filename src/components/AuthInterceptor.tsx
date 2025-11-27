import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuthState } from '@/context/AuthStateContext';
import { MFAVerificationGate } from './MFAVerificationGate';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AuthInterceptorProps {
  children: React.ReactNode;
}

/**
 * AuthInterceptor - Security component that enforces 2FA verification
 * 
 * This component intercepts ALL authenticated sessions and ensures that:
 * 1. Users with 2FA enabled MUST complete 2FA verification
 * 2. Users can bypass 2FA ONLY if they have a valid trusted device token
 * 3. Sessions are properly elevated to AAL2 after 2FA verification
 * 
 * SECURITY CRITICAL: This is the last line of defense against 2FA bypass
 */
export const AuthInterceptor = ({ children }: AuthInterceptorProps) => {
  const [interceptorState, setInterceptorState] = useState<'checking' | 'requires_2fa' | 'authenticated'>('checking');
  const [challengeData, setChallengeData] = useState<any>(null);
  const { checkAuthRequires2FA, rememberDevice } = useAuthGuard();
  const { setAuthState: setGlobalAuthState } = useAuthState();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use refs to prevent duplicate checks
  const isCheckingRef = useRef(false);
  const hasCheckedRef = useRef(false);

  // Public routes that don't require authentication
  const publicRoutes = ['/auth', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  useEffect(() => {
    let isMounted = true;

    const checkAuthentication = async () => {
      // Prevent duplicate checks for the same state
      if (isCheckingRef.current) {
        console.log('🛡️ AuthInterceptor: Already checking, skipping duplicate');
        return;
      }
      
      // If already authenticated, skip check
      if (interceptorState === 'authenticated') {
        console.log('🛡️ AuthInterceptor: Already authenticated, skipping check');
        return;
      }
      
      // If already showing 2FA gate, skip check
      if (interceptorState === 'requires_2fa') {
        console.log('🛡️ AuthInterceptor: Already showing 2FA gate, skipping check');
        return;
      }

      isCheckingRef.current = true;
      console.log('🛡️ AuthInterceptor: Starting authentication check for route:', location.pathname);

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

        console.log('🛡️ AuthInterceptor: Session found, checking 2FA requirements...');
        
        // Check if 2FA verification is required
        const authCheck = await checkAuthRequires2FA();
        console.log('🛡️ AuthInterceptor: Auth check result:', authCheck);

        if (!isMounted) return;

        // If 2FA is not enabled, allow access
        if (!authCheck.has2FAEnabled) {
          console.log('🛡️ AuthInterceptor: 2FA not enabled, allowing access');
          setGlobalAuthState('AUTHENTICATED');
          setInterceptorState('authenticated');
          return;
        }

        // If device is remembered, allow access
        if (authCheck.isDeviceRemembered) {
          console.log('🛡️ AuthInterceptor: Device is trusted, allowing access');
          setGlobalAuthState('AUTHENTICATED');
          setInterceptorState('authenticated');
          return;
        }

        // 2FA is required - create challenge
        console.log('🛡️ AuthInterceptor: 2FA required, creating challenge');
        const totpFactor = authCheck.factors?.[0];
        
        if (!totpFactor) {
          console.error('🛡️ AuthInterceptor: No TOTP factor found despite 2FA being enabled');
          toast.error('Erro na configuração 2FA. Faça login novamente.');
          await supabase.auth.signOut();
          navigate('/auth');
          return;
        }

        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id
        });

        if (challengeError) {
          console.error('🛡️ AuthInterceptor: Failed to create MFA challenge:', challengeError);
          toast.error('Erro ao criar verificação 2FA. Faça login novamente.');
          await supabase.auth.signOut();
          navigate('/auth');
          return;
        }

        if (!isMounted) return;

        console.log('🛡️ AuthInterceptor: Challenge created, showing verification gate');
        setGlobalAuthState('AWAITING_2FA');
        setChallengeData({
          factorId: totpFactor.id,
          challengeId: challenge.id,
          operation: 'access'
        });
        setInterceptorState('requires_2fa');

      } catch (error) {
        console.error('🛡️ AuthInterceptor: Critical error during auth check:', error);
        if (isMounted) {
          toast.error('Erro crítico de segurança. Faça login novamente.');
          await supabase.auth.signOut();
          navigate('/auth');
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Only run check if in 'checking' state
    if (interceptorState === 'checking') {
      checkAuthentication();
    }

    return () => {
      isMounted = false;
    };
  }, [location.pathname, interceptorState, isPublicRoute, navigate]);
  
  // Reset to checking state when route changes (only if already authenticated)
  useEffect(() => {
    if (interceptorState === 'authenticated') {
      // Reset checking only when navigating to different route types
      const wasPublic = publicRoutes.includes(location.pathname);
      if (!wasPublic) {
        // Stay authenticated for protected routes
        return;
      }
    }
  }, [location.pathname]);

  const handle2FASuccess = async (deviceRemembered: boolean) => {
    console.log('🛡️ AuthInterceptor: 2FA verification successful');
    
    // Check if there was a pending remember device request from login
    const rememberPending = sessionStorage.getItem('remember_device_pending');
    const shouldRemember = deviceRemembered || rememberPending === 'true';
    
    if (shouldRemember) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('🛡️ AuthInterceptor: Registering device as trusted');
        await rememberDevice(user.id);
        sessionStorage.removeItem('remember_device_pending');
      }
    }

    setGlobalAuthState('AUTHENTICATED');
    setInterceptorState('authenticated');
    toast.success('Login realizado com sucesso!');
  };

  const handle2FACancel = async () => {
    console.log('🛡️ AuthInterceptor: User cancelled 2FA verification, logging out');
    setGlobalAuthState('IDLE');
    await supabase.auth.signOut();
    navigate('/auth');
    toast.error('Verificação 2FA cancelada. Faça login novamente.');
  };

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

  // Show 2FA verification gate if required
  if (interceptorState === 'requires_2fa' && challengeData) {
    // Check if user wants to remember device from login
    const rememberPending = sessionStorage.getItem('remember_device_pending') === 'true';
    
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <MFAVerificationGate
          open={true}
          operation="access"
          operationLabel="acessar sua conta"
          challengeData={challengeData}
          onVerified={handle2FASuccess}
          onCancel={handle2FACancel}
          showRememberOption={!rememberPending}
          presetRememberDevice={rememberPending}
        />
      </div>
    );
  }

  // Authentication verified, render children
  return <>{children}</>;
};
