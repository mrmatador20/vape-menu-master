import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MFAGuard = () => {
  const navigate = useNavigate();

  useEffect(() => {
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
            shouldBeAAL2: true 
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

    checkMFAStatus();

    // Also check when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkMFAStatus();
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};
