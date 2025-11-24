import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Key, Eye, EyeOff, Check, X, CheckCircle2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const passwordSchema = z.object({
  newPassword: z.string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Deve conter pelo menos um caractere especial'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

type PasswordStrength = 'weak' | 'medium' | 'strong';

export const ResetPasswordForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [resetComplete, setResetComplete] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string>('');
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Check if this is a password reset flow
    const checkSession = async () => {
      try {
        const resetMode = searchParams.get('reset');
        const errorParam = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        const errorDescription = searchParams.get('error_description');
        
        // Check for errors in URL first
        if (errorParam || errorCode) {
          setIsCheckingSession(false);
          setIsValidSession(false);
          
          if (errorCode === 'otp_expired') {
            setErrorMessage('Este link de recuperação expirou. Por favor, solicite um novo link de recuperação.');
          } else if (errorDescription) {
            setErrorMessage(decodeURIComponent(errorDescription));
          } else {
            setErrorMessage('Link inválido. Por favor, solicite um novo link de recuperação.');
          }
          return;
        }
        
        if (resetMode === 'true') {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            setIsValidSession(true);
            
            // Check if user has MFA enabled
            const { data: mfaData } = await supabase.auth.mfa.listFactors();
            const totpFactor = mfaData?.all?.find(f => f.factor_type === 'totp' && f.status === 'verified');
            
            if (totpFactor) {
              // User has MFA enabled, require verification before password reset
              setNeedsMfa(true);
              setMfaFactorId(totpFactor.id);
            }
          } else {
            setIsValidSession(false);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setIsValidSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [searchParams]);

  const getPasswordStrength = (password: string): PasswordStrength => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  const getStrengthColor = (strength: PasswordStrength | null) => {
    if (!strength) return 'bg-muted';
    switch (strength) {
      case 'weak': return 'bg-destructive';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
    }
  };

  const validatePassword = () => {
    try {
      passwordSchema.parse({ newPassword, confirmPassword });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleVerifyMfa = async () => {
    if (mfaCode.length !== 6) {
      toast.error('Código inválido', {
        description: 'Digite um código de 6 dígitos',
      });
      return;
    }

    setIsVerifyingMfa(true);
    
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode,
      });

      if (error) throw error;

      // MFA verified, session is now AAL2, can proceed with password reset
      setNeedsMfa(false);
      setMfaCode('');
      toast.success('Código verificado com sucesso!', {
        description: 'Agora você pode redefinir sua senha',
      });
    } catch (error: any) {
      console.error('MFA verification error:', error);
      toast.error('Código incorreto', {
        description: 'Verifique o código no seu autenticador e tente novamente',
      });
      setMfaCode('');
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Update password_changed_at timestamp
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ password_changed_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      setResetComplete(true);
      
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (error: any) {
      toast.error('Erro ao redefinir senha', {
        description: error.message,
      });
    } finally {
      setIsResetting(false);
    }
  };

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: newPassword.length >= 8 },
    { label: 'Uma letra maiúscula', met: /[A-Z]/.test(newPassword) },
    { label: 'Uma letra minúscula', met: /[a-z]/.test(newPassword) },
    { label: 'Um número', met: /[0-9]/.test(newPassword) },
    { label: 'Um caractere especial', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Link Inválido ou Expirado</CardTitle>
          <CardDescription>
            {errorMessage || 'Este link de recuperação de senha é inválido ou já expirou.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Para sua segurança, os links de recuperação expiram após um curto período de tempo. Solicite um novo link para continuar.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/auth')} className="w-full">
            Voltar ao Login e Solicitar Novo Link
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (resetComplete) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Senha Redefinida!</h3>
              <p className="text-muted-foreground">
                Sua senha foi redefinida com sucesso. Redirecionando para o login...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (needsMfa) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Autenticação de Dois Fatores - Segurança Extra
          </CardTitle>
          <CardDescription>
            Reautenticação necessária para atualização de senha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="space-y-3">
              <p className="font-medium">
                Para garantir a segurança da sua conta, é necessário realizar uma reautenticação com autenticação de dois fatores (MFA) antes de poder atualizar sua senha.
              </p>
              
              <div className="space-y-2 text-sm">
                <p className="font-medium">Passos para continuar:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Insira o código de verificação enviado pelo seu aplicativo de autenticação (Google Authenticator, Authy, etc.).</li>
                  <li>Após a verificação, você poderá continuar com a atualização da sua senha.</li>
                </ol>
              </div>

              <p className="text-xs text-muted-foreground pt-2 border-t">
                <strong>Importante:</strong> A autenticação de dois fatores é uma medida de segurança para proteger sua conta contra acessos não autorizados. Certifique-se de que o código inserido seja válido e recente.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="mfa-code">Digite o Código 2FA</Label>
            <InputOTP
              maxLength={6}
              value={mfaCode}
              onChange={setMfaCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-muted-foreground">
              Abra seu aplicativo autenticador (Google Authenticator, Authy, etc.) e digite o código de 6 dígitos
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleVerifyMfa}
              disabled={isVerifyingMfa || mfaCode.length !== 6}
              className="w-full"
            >
              {isVerifyingMfa ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Confirmar Código MFA'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open('https://support.google.com/accounts/answer/1066447', '_blank')}
              className="w-full"
            >
              Precisa de ajuda com a autenticação de dois fatores?
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Redefinir Senha
        </CardTitle>
        <CardDescription>
          Crie uma nova senha forte para sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova Senha</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={errors.newPassword ? 'border-destructive' : ''}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-xs text-destructive">{errors.newPassword}</p>
          )}
          
          {newPassword && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${getStrengthColor(passwordStrength)}`}
                    style={{ width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%' }}
                  />
                </div>
                <span className="text-xs font-medium capitalize">
                  {passwordStrength === 'weak' ? 'Fraca' : passwordStrength === 'medium' ? 'Média' : 'Forte'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={errors.confirmPassword ? 'border-destructive' : ''}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        {newPassword && (
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <p className="text-xs font-medium mb-2">Requisitos da senha:</p>
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={req.met ? 'text-green-500' : 'text-muted-foreground'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleResetPassword}
          disabled={isResetting || !newPassword || !confirmPassword}
          className="w-full"
        >
          {isResetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redefinindo...
            </>
          ) : (
            'Redefinir Senha'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
