import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

export const useMFA = () => {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);

  const enrollMFA = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      // Generate QR code from the URI
      const qrCodeUrl = await QRCode.toDataURL(data.totp.qr_code);

      return {
        factorId: data.id,
        qrCode: qrCodeUrl,
        secret: data.totp.secret,
        uri: data.totp.qr_code,
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

  const verifyEnrollment = async (factorId: string, code: string) => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) throw error;

      toast({
        title: '2FA ativado com sucesso!',
        description: 'Sua conta agora está protegida com autenticação de dois fatores.',
      });

      return data;
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
    unenrollMFA,
    listFactors,
    isEnrolling,
    isVerifying,
    isUnenrolling,
  };
};
