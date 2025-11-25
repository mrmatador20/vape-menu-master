import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MFAVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onSuccess: () => void;
}

export const MFAVerifyDialog = ({ open, onOpenChange, factorId, onSuccess }: MFAVerifyDialogProps) => {
  const { verifyMFACode, verifyBackupCode } = useMFA();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBlocked && blockTimeRemaining > 0) {
      timer = setInterval(() => {
        setBlockTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsBlocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isBlocked, blockTimeRemaining]);

  const handleVerify = async () => {
    if (!code) return;
    if (!useBackupCode && code.length !== 6) return;
    if (useBackupCode && code.length < 8) return;
    if (isBlocked) return;

    setIsVerifying(true);
    try {
      // First verify the MFA code
      if (useBackupCode) {
        const isValid = await verifyBackupCode(code);
        if (!isValid) {
          handleFailedAttempt();
          return;
        }
      } else {
        await verifyMFACode(factorId, code);
      }

      // Then verify reCAPTCHA
      try {
        const recaptchaToken = await (window as any).grecaptcha.execute(
          import.meta.env.VITE_RECAPTCHA_SITE_KEY,
          { action: 'verify_2fa' }
        );

        const { data: recaptchaResult, error: recaptchaError } = await supabase.functions.invoke(
          'verify-recaptcha',
          {
            body: { token: recaptchaToken },
          }
        );

        if (recaptchaError || !recaptchaResult?.success) {
          toast({
            title: 'Verificação de segurança falhou',
            description: 'Por favor, tente novamente.',
            variant: 'destructive',
          });
          return;
        }
      } catch (recaptchaError) {
        console.error('reCAPTCHA verification failed:', recaptchaError);
        toast({
          title: 'Erro na verificação de segurança',
          description: 'Por favor, tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      // If both verifications passed, proceed
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Verification error:', error);
      handleFailedAttempt();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFailedAttempt = async () => {
    setCode('');
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // Send security alert email
    if (newAttempts >= 3) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          await supabase.functions.invoke('send-security-alert', {
            body: {
              alertType: newAttempts >= 5 ? 'account_blocked' : 'failed_2fa',
              email: user.email,
              details: {
                attempts: newAttempts,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
              },
            },
          });
        }
      } catch (emailError) {
        console.error('Failed to send security alert:', emailError);
      }
    }

    if (newAttempts >= 5) {
      setIsBlocked(true);
      setBlockTimeRemaining(900); // 15 minutos
      toast({
        title: 'Conta bloqueada',
        description: 'Você atingiu o limite de tentativas de login. Para sua segurança, sua conta será bloqueada por 15 minutos.',
        variant: 'destructive',
      });
    } else if (newAttempts >= 3) {
      toast({
        title: 'Atenção',
        description: `Código incorreto. Você tem ${5 - newAttempts} tentativas restantes antes do bloqueio.`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Código incorreto',
        description: 'Verifique o código e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleResendCode = () => {
    toast({
      title: 'Código reenviado',
      description: 'Verifique seu aplicativo autenticador para o novo código.',
    });
  };

  const handleClose = () => {
    if (!isBlocked) {
      setCode('');
      setUseBackupCode(false);
      setAttempts(0);
      onOpenChange(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Autenticação de 2 Fatores - Segurança Extra
          </DialogTitle>
          <DialogDescription className="text-sm">
            {useBackupCode 
              ? 'Digite um dos seus códigos de backup de 8 caracteres'
              : 'Para garantir que é você quem está acessando sua conta, por favor insira o código de autenticação de 2 fatores enviado para o seu dispositivo.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isBlocked && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você atingiu o limite de tentativas de login. Para sua segurança, sua conta está bloqueada por {formatTime(blockTimeRemaining)}. Se precisar de ajuda, entre em contato com o suporte.
              </AlertDescription>
            </Alert>
          )}

          {!useBackupCode && !isBlocked && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Caso não tenha recebido o código ou tenha problemas para acessá-lo, verifique o aplicativo de autenticação (Google Authenticator, Authy, etc.).
              </AlertDescription>
            </Alert>
          )}

          {!isBlocked && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Perdeu acesso ao seu dispositivo?{' '}
                <button
                  onClick={() => setUseBackupCode(!useBackupCode)}
                  className="underline font-medium"
                >
                  {useBackupCode ? 'Usar código do app' : 'Usar código de backup'}
                </button>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="mfa-code">
              {useBackupCode ? 'Código de Backup' : 'Digite o Código 2FA'}
            </Label>
            <Input
              id="mfa-code"
              placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
              value={code}
              onChange={(e) => {
                if (useBackupCode) {
                  setCode(e.target.value.toUpperCase());
                } else {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isBlocked) {
                  if (useBackupCode && code.length >= 8) {
                    handleVerify();
                  } else if (!useBackupCode && code.length === 6) {
                    handleVerify();
                  }
                }
              }}
              maxLength={useBackupCode ? 9 : 6}
              autoFocus
              disabled={isBlocked}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          {!useBackupCode && !isBlocked && (
            <div className="text-center">
              <button
                onClick={handleResendCode}
                className="text-sm text-primary hover:underline"
              >
                Não recebeu o código? Clique aqui para reenviar.
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isBlocked}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleVerify}
              disabled={
                isBlocked ||
                isVerifying || 
                (useBackupCode ? code.length < 8 : code.length !== 6)
              }
              className="flex-1"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Código'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
