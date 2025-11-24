import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logActivity } from '@/hooks/useActivityLogs';
import QRCode from 'qrcode';

// Generate random backup code
const generateBackupCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.match(/.{1,4}/g)?.join('-') || code;
};

// Simple hash function for backup codes
const hashCode = async (code: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const useMFA = () => {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);

  const enrollMFA = async () => {
    setIsEnrolling(true);
    try {
      // Check for existing unverified factors and remove them
      const factors = await listFactors();
      const unverifiedFactors = factors.all?.filter(f => f.status === 'unverified') || [];
      
      for (const factor of unverifiedFactors) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        } catch (e) {
          console.error('Error removing unverified factor:', e);
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      // Get current user email for the URI
      const { data: { user } } = await supabase.auth.getUser();
      const userIdentifier = user?.email || 'user';

      // Create a shorter custom TOTP URI instead of using the long Supabase one
      const customUri = `otpauth://totp/App:${userIdentifier}?secret=${data.totp.secret}&issuer=App`;

      // Generate QR code with the shorter custom URI
      let qrCodeUrl = null;
      try {
        qrCodeUrl = await QRCode.toDataURL(customUri, {
          errorCorrectionLevel: 'L',
          margin: 1,
          width: 200,
        });
      } catch (qrError) {
        console.error('QR code generation failed:', qrError);
      }

      return {
        factorId: data.id,
        qrCode: qrCodeUrl,
        secret: data.totp.secret,
        uri: customUri,
      };
    } catch (error: any) {
      toast({
        title: 'Erro ao configurar 2FA',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsEnrolling(false);
    }
  };

  const generateBackupCodes = async (): Promise<string[]> => {
    const codes: string[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    // Generate 8 backup codes
    for (let i = 0; i < 8; i++) {
      codes.push(generateBackupCode());
    }

    // Store hashed codes in database
    const hashedCodes = await Promise.all(codes.map(code => hashCode(code)));
    const { error } = await supabase.from('mfa_backup_codes').insert(
      hashedCodes.map(hash => ({
        user_id: user.id,
        code_hash: hash,
      }))
    );

    if (error) throw error;

    return codes;
  };

  const verifyEnrollment = async (factorId: string, code: string) => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) throw error;

      // Generate backup codes after successful enrollment
      const backupCodes = await generateBackupCodes();

      await logActivity('mfa_enabled');

      toast({
        title: '2FA ativado com sucesso!',
        description: 'Sua conta agora está protegida com autenticação de dois fatores.',
      });

      return { ...data, backupCodes };
    } catch (error: any) {
      toast({
        title: 'Código inválido',
        description: 'Verifique o código e tente novamente.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyBackupCode = async (code: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const hashedCode = await hashCode(code.replace(/-/g, ''));

      // Find unused backup code
      const { data: backupCode, error } = await supabase
        .from('mfa_backup_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('code_hash', hashedCode)
        .is('used_at', null)
        .single();

      if (error || !backupCode) {
        toast({
          title: 'Código de backup inválido',
          description: 'O código está incorreto ou já foi usado.',
          variant: 'destructive',
        });
        return false;
      }

      // Mark code as used
      await supabase
        .from('mfa_backup_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', backupCode.id);

      // SECURITY FIX: Elevate session to AAL2 after backup code verification
      // This ensures the user gets proper MFA authentication level
      const factors = await listFactors();
      const activeFactor = factors.totp?.find((f: any) => f.status === 'verified');
      
      if (activeFactor) {
        // Challenge and verify to elevate session to AAL2
        const challenge = await supabase.auth.mfa.challenge({ factorId: activeFactor.id });
        
        if (challenge.error) {
          console.error('MFA challenge error:', challenge.error);
          throw challenge.error;
        }

        // Verify using the backup code (Supabase accepts backup codes in verify)
        const verify = await supabase.auth.mfa.verify({
          factorId: activeFactor.id,
          challengeId: challenge.data.id,
          code: code.replace(/-/g, ''),
        });

        if (verify.error) {
          console.error('MFA verify error:', verify.error);
          throw verify.error;
        }

        // Log successful backup code usage
        await logActivity('mfa_backup_code_used');
      }

      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao verificar código',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const verifyMFACode = async (factorId: string, code: string) => {
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });

      if (verify.error) throw verify.error;

      return verify.data;
    } catch (error: any) {
      toast({
        title: 'Código inválido',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const unenrollMFA = async (factorId: string) => {
    setIsUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) throw error;

      await logActivity('mfa_disabled');

      toast({
        title: '2FA desativado',
        description: 'A autenticação de dois fatores foi removida da sua conta.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao desativar 2FA',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUnenrolling(false);
    }
  };

  const listFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error listing MFA factors:', error);
      return { all: [], totp: [] };
    }
  };

  return {
    enrollMFA,
    verifyEnrollment,
    verifyMFACode,
    verifyBackupCode,
    generateBackupCodes,
    unenrollMFA,
    listFactors,
    isEnrolling,
    isVerifying,
    isUnenrolling,
  };
};
