import { useEffect, useState } from 'react';
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

  // Public routes that don't require authentication
  const publicRoutes = ['/auth', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  useEffect(() => {
    let isMounted = true;

    const checkAuthentication = async () => {
      console.log('🛡️ AuthInterceptor: Starting authentication check for route:', location.pathname);

      // CRITICAL: Even public routes must be checked if user has active session
      // A user with 2FA enabled CANNOT access ANY page without verification

      try {
        // Check if user has a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // If no session and trying to access protected route, redirect to login
        if ((sessionError || !session) && !isPublicRoute) {
          console.log('🛡️ AuthInterceptor: No session found, redirecting to login');
          navigate('/auth');
          return;
        }

        // If no session and on public route, allow access
        if (!session && isPublicRoute) {
          console.log('🛡️ AuthInterceptor: No session, public route, allowing access');
          setGlobalAuthState('IDLE');
          setInterceptorState('authenticated');
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
      }
    };

    checkAuthentication();

    return () => {
      isMounted = false;
    };
  }, [location.pathname, isPublicRoute, navigate, checkAuthRequires2FA, rememberDevice]);

  // CRITICAL: Also run on component mount to catch initial page load
  useEffect(() => {
    const checkInitialAuth = async () => {
      console.log('🛡️ AuthInterceptor: Initial mount check');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      // If there's a session, force authentication check immediately
      if (session) {
        console.log('🛡️ AuthInterceptor: Session detected on mount, forcing auth check');
        setInterceptorState('checking'); // Reset to checking to trigger full validation
      }
    };
    
    checkInitialAuth();
  }, []);

  const handle2FASuccess = async (deviceRemembered: boolean) => {
    console.log('🛡️ AuthInterceptor: 2FA verification successful');
    
    if (deviceRemembered) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('🛡️ AuthInterceptor: Registering device as trusted');
        await rememberDevice(user.id);
      }
    }

    setGlobalAuthState('AUTHENTICATED');
    setInterceptorState('authenticated');
    toast.success('Verificação 2FA concluída com sucesso!');
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
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <MFAVerificationGate
          open={true}
          operation="access"
          operationLabel="acessar sua conta"
          challengeData={challengeData}
          onVerified={handle2FASuccess}
          onCancel={handle2FACancel}
          showRememberOption={true}
          presetRememberDevice={false}
        />
      </div>
    );
  }

  // Authentication verified, render children
  return <>{children}</>;
};
