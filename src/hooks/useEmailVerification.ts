import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useEmailVerification = () => {
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const sendVerificationCode = async (purpose: 'password_change' | 'login') => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { purpose },
      });

      if (error) throw error;

      toast({
        title: 'Código enviado!',
        description: `Verifique seu email. O código expira em ${data.expiresIn} minutos.`,
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar código',
        description: error.message || 'Não foi possível enviar o código por email',
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async (code: string, purpose: 'password_change' | 'login') => {
    setIsVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Find valid code
      const { data: verificationCode, error: findError } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('code', code)
        .eq('purpose', purpose)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) throw findError;

      if (!verificationCode) {
        toast({
          title: 'Código inválido',
          description: 'O código está incorreto, expirado ou já foi usado.',
          variant: 'destructive',
        });
        return { success: false };
      }

      // Mark code as used
      const { error: updateError } = await supabase
        .from('email_verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', verificationCode.id);

      if (updateError) throw updateError;

      toast({
        title: 'Código verificado!',
        description: 'Seu código foi confirmado com sucesso.',
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Erro na verificação',
        description: error.message || 'Não foi possível verificar o código',
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    sendVerificationCode,
    verifyCode,
    isSending,
    isVerifying,
  };
};
