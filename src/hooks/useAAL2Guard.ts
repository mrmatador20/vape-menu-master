import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/hooks/useActivityLogs';
import { claimTotpCode } from '@/lib/totpReplayGuard';

export interface AAL2Challenge {
  factorId: string;
  challengeId: string;
  operation: string;
  createdAt: number;
}

export interface AAL2VerificationResult {
  allowed: boolean;
  challenge?: AAL2Challenge;
  error?: string;
}

export const useAAL2Guard = () => {
  const verifyAAL2 = async (operation: string): Promise<AAL2VerificationResult> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error(`🔒 AAL2 Guard: No session for ${operation}`);
        await logActivity('unauthorized_access_attempt', {
          metadata: { operation, reason: 'no_session' }
        });
        return { 
          allowed: false, 
          error: 'Sessão inválida. Faça login novamente.' 
        };
      }

      // Check current AAL level
      // @ts-ignore - aal property exists but may not be in type definition
      const aal = (session as any).aal;
      
      if (aal === 'aal2') {
        console.log(`✅ AAL2 Guard: ${operation} allowed for AAL2 session`);
        await logActivity('sensitive_data_accessed', {
          metadata: { operation, aal_level: 'aal2' }
        });
        return { allowed: true };
      }

      // AAL1 session - require TOTP verification
      console.warn(`⚠️ AAL2 Guard: ${operation} requires AAL2 elevation`);
      
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        console.error(`❌ AAL2 Guard: Failed to list factors for ${operation}`, factorsError);
        return { 
          allowed: false, 
          error: 'Erro ao verificar autenticação.' 
        };
      }

      const totpFactor = factorsData?.totp?.[0];
      
      if (!totpFactor) {
        console.error(`❌ AAL2 Guard: No TOTP factor available for ${operation}`);
        await logActivity('unauthorized_access_attempt', {
          metadata: { operation, reason: 'no_totp_factor' }
        });
        return { 
          allowed: false, 
          error: 'Autenticação de dois fatores não configurada. Configure 2FA antes de realizar esta operação.' 
        };
      }

      // Create challenge for TOTP verification
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      if (challengeError || !challengeData) {
        console.error(`❌ AAL2 Guard: Challenge failed for ${operation}`, challengeError);
        return { 
          allowed: false, 
          error: 'Erro ao criar desafio de autenticação.' 
        };
      }

      console.log(`🔐 AAL2 Guard: Challenge created for ${operation}`);
      
      return { 
        allowed: false, 
        challenge: {
          factorId: totpFactor.id,
          challengeId: challengeData.id,
          operation: operation,
          createdAt: Date.now(),
        }
      };
    } catch (error: any) {
      console.error(`❌ AAL2 Guard: Unexpected error for ${operation}`, error);
      return { 
        allowed: false, 
        error: 'Erro inesperado ao verificar autenticação.' 
      };
    }
  };

  const verifyTOTPCode = async (
    factorId: string, 
    challengeId: string, 
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Anti-replay: consome o código na janela de 30s atual (validado no servidor)
      const claim = await claimTotpCode(code);
      if (!claim.allowed) {
        console.warn('🔐 Anti-replay: código recusado -', claim.error);
        return { success: false, error: claim.error };
      }

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code
      });

      if (error) {
        console.error('❌ MFA verification failed:', error);
        return { 
          success: false, 
          error: 'Código de verificação inválido.' 
        };
      }

      console.log('✅ MFA verified, session elevated to AAL2');
      return { success: true };
    } catch (error: any) {
      console.error('❌ MFA verification error:', error);
      return { 
        success: false, 
        error: 'Erro ao verificar código.' 
      };
    }
  };

  return { verifyAAL2, verifyTOTPCode };
};
