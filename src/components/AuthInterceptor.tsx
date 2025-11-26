import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthGuard } from '@/hooks/useAuthGuard';
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
  const [authState, setAuthState] = useState<'checking' | 'requires_2fa' | 'authenticated'>('checking');
  const [challengeData, setChallengeData] = useState<any>(null);
  const { checkAuthRequires2FA, rememberDevice } = useAuthGuard();
  const location = useLocation();
  const navigate = useNavigate();

  // Public routes that don't require authentication
  const publicRoutes = ['/auth', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  useEffect(() => {
    let isMounted = true;

    const checkAuthentication = async () => {
      console.log('🛡️ AuthInterceptor: Starting authentication check for route:', location.pathname);

      // Skip check for public routes
      if (isPublicRoute) {
        console.log('🛡️ AuthInterceptor: Public route, skipping check');
        setAuthState('authenticated');
        return;
      }

      try {
        // Check if user has a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.log('🛡️ AuthInterceptor: No session found, redirecting to login');
          if (isMounted) {
            setAuthState('checking');
            navigate('/auth');
          }
          return;
        }

        console.log('🛡️ AuthInterceptor: Session found, checking 2FA requirements...');
        
        // Check if 2FA verification is required
        const authCheck = await checkAuthRequires2FA();
        console.log('🛡️ AuthInterceptor: Auth check result:', JSON.stringify(authCheck, null, 2));

        if (!isMounted) return;

        // CRITICAL: If user has 2FA enabled but device is NOT remembered, BLOCK ACCESS
        if (authCheck.has2FAEnabled && !authCheck.isDeviceRemembered) {
          console.log('🛡️ AuthInterceptor: 2FA REQUIRED - User has 2FA enabled and device is not remembered');
          
          const totpFactor = authCheck.factors?.[0];
          
          if (!totpFactor) {
            console.error('🛡️ AuthInterceptor: SECURITY VIOLATION - No TOTP factor found despite 2FA being enabled');
            toast.error('Erro na configuração 2FA. Faça login novamente.');
            await supabase.auth.signOut();
            navigate('/auth');
            return;
          }

          // Create MFA challenge
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

          console.log('🛡️ AuthInterceptor: Challenge created, BLOCKING ACCESS and showing verification gate');
          setChallengeData({
            factorId: totpFactor.id,
            challengeId: challenge.id,
            operation: 'access'
          });
          setAuthState('requires_2fa');
          return;
        }

        // If 2FA is not enabled, allow access
        if (!authCheck.has2FAEnabled) {
          console.log('🛡️ AuthInterceptor: 2FA not enabled for this user, allowing access');
          setAuthState('authenticated');
          return;
        }

        // If device is remembered and user has 2FA, allow access
        if (authCheck.isDeviceRemembered) {
          console.log('🛡️ AuthInterceptor: Device is trusted and verified, allowing access');
          setAuthState('authenticated');
          return;
        }

        // FALLBACK: If we reach here, something is wrong - block access
        console.error('🛡️ AuthInterceptor: UNEXPECTED STATE - blocking access by default');
        setAuthState('checking');
        await supabase.auth.signOut();
        navigate('/auth');

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

    // CRITICAL: Also listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🛡️ AuthInterceptor: Auth state changed:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Re-check authentication when state changes
        checkAuthentication();
      }
      if (event === 'SIGNED_OUT') {
        setAuthState('checking');
        navigate('/auth');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [location.pathname]);

  const handle2FASuccess = async (deviceRemembered: boolean) => {
    console.log('🛡️ AuthInterceptor: 2FA verification successful');
    
    if (deviceRemembered) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('🛡️ AuthInterceptor: Registering device as trusted');
        await rememberDevice(user.id);
      }
    }

    setAuthState('authenticated');
    toast.success('Verificação 2FA concluída com sucesso!');
  };

  const handle2FACancel = async () => {
    console.log('🛡️ AuthInterceptor: User cancelled 2FA verification, logging out');
    await supabase.auth.signOut();
    navigate('/auth');
    toast.error('Verificação 2FA cancelada. Faça login novamente.');
  };

  // Show loading state while checking
  if (authState === 'checking') {
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
  if (authState === 'requires_2fa' && challengeData) {
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
