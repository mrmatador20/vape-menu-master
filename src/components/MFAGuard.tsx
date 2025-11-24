import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MFAGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't run on auth page - let the Auth component handle MFA flow
    if (location.pathname === '/auth') {
      return;
    }

    const checkMFAStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;

        // Check if user has MFA enabled
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasMFA = factors?.totp?.some((f: any) => f.status === 'verified') || false;

        if (hasMFA) {
          const aal = (session as any)?.aal;
          
          console.log('🔐 MFA Guard Check:', { 
            hasMFA, 
            currentAAL: aal,
            shouldBeAAL2: true,
            currentPath: location.pathname
          });
          
          // If user has MFA enabled but session is only AAL1, force logout
          if (aal !== 'aal2') {
            console.log('🚨 Forcing logout - MFA enabled but not verified');
            await supabase.auth.signOut();
            toast.error('Por favor, faça login novamente com seu código 2FA');
            navigate('/auth');
          }
        }
      } catch (error) {
        console.error('MFA Guard error:', error);
      }
    };

    // Small delay to allow Auth page to show MFA dialog first
    const timeoutId = setTimeout(() => {
      checkMFAStatus();
    }, 500);

    // Also check when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        checkMFAStatus();
      }, 500);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  return null;
};
