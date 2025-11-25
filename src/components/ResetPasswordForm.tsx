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

  useEffect(() => {
    // Check if this is a password reset flow
    const checkSession = async () => {
      const resetMode = searchParams.get('reset');
      
      if (resetMode === 'true') {
        try {
          // Add 5 second timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session check timeout')), 5000)
          );
          
          const sessionPromise = supabase.auth.getSession();
          
          // Race between session check and timeout
          const { data: { session } } = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]) as any;
          
          if (session) {
            setIsValidSession(true);
            
            // Check if user has MFA enabled
            const { data } = await supabase.auth.mfa.listFactors();
            const totpFactor = data?.totp?.find(f => f.status === 'verified');
            
            if (totpFactor) {
              // User has MFA, need to verify before allowing password change
              setNeedsMfa(true);
              setMfaFactorId(totpFactor.id);
            }
          }
        } catch (error) {
          console.error('Session check failed:', error);
          setIsValidSession(false);
        }
      }
      setIsCheckingSession(false);
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
    console.log('=== MFA VERIFICATION STARTED (RESET PASSWORD) ===');
    console.log('Current state:', { 
      mfaCodeLength: mfaCode.length,
      mfaFactorId,
      isVerifyingMfa 
    });
    
    if (mfaCode.length !== 6) {
      console.log('Invalid code length:', mfaCode.length);
      toast.error('Código inválido', {
        description: 'Digite um código de 6 dígitos',
      });
      return;
    }

    console.log('Step 1: Setting verification state to TRUE...');
    setIsVerifyingMfa(true);
    
    // Add timeout protection - increase to 45 seconds
    let timeoutTriggered = false;
    const timeoutId = setTimeout(() => {
      console.error('TIMEOUT: MFA verification took too long (45s)');
      timeoutTriggered = true;
      setIsVerifyingMfa(false);
      toast.error('Tempo esgotado', {
        description: 'A verificação demorou muito. Tente novamente.',
      });
    }, 45000); // Increased from 30s to 45s
    
    try {
      if (timeoutTriggered) {
        console.log('Timeout already triggered before start, aborting...');
        return;
      }

      console.log('Step 2: Starting MFA verification...', { factorId: mfaFactorId });
      
      // First create a challenge with timeout
      console.log('Step 3: Creating challenge...');
      const challengePromise = supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      
      console.log('Waiting for challenge response...');
      const { data: challengeData, error: challengeError } = await Promise.race([
        challengePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Challenge timeout')), 10000)
        )
      ]) as any;

      console.log('Challenge response received:', { 
        hasData: !!challengeData,
        challengeId: challengeData?.id,
        hasError: !!challengeError,
        errorMessage: challengeError?.message
      });

      if (timeoutTriggered) {
        console.log('Timeout already triggered after challenge, aborting...');
        return;
      }

      if (challengeError) {
        console.error('Challenge error:', challengeError);
        throw challengeError;
      }

      if (!challengeData?.id) {
        console.error('No challenge ID returned');
        throw new Error('No challenge ID returned');
      }

      // Then verify the code with timeout
      console.log('Step 4: Verifying code against challenge...');
      const verifyPromise = supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      console.log('Waiting for verify response...');
      const { data: verifyData, error: verifyError } = await Promise.race([
        verifyPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Verify timeout')), 10000)
        )
      ]) as any;

      console.log('Verify response received:', { 
        hasData: !!verifyData,
        hasError: !!verifyError,
        errorMessage: verifyError?.message
      });

      if (timeoutTriggered) {
        console.log('Timeout already triggered after verify, aborting...');
        return;
      }

      if (verifyError) {
        console.error('Verify error:', verifyError);
        throw verifyError;
      }

      // Check the session after verification
      console.log('Step 5: Checking session after MFA verification...');
      const getSessionPromise = supabase.auth.getSession();
      const { data: { session: updatedSession } } = await Promise.race([
        getSessionPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        )
      ]) as any;
      
      console.log('Session after MFA verification:', {
        userId: updatedSession?.user?.id,
        hasSession: !!updatedSession
      });

      // MFA verified successfully - update state immediately
      console.log('Step 6: MFA verification successful, updating state to FALSE...');
      
      clearTimeout(timeoutId);
      
      // Update states to show password reset form
      setNeedsMfa(false);
      setIsVerifyingMfa(false);
      
      console.log('Step 7: Showing success toast...');
      toast.success('Código verificado!', {
        description: 'Agora você pode redefinir sua senha',
      });
      
      console.log('=== MFA VERIFICATION COMPLETED SUCCESSFULLY ===');
    } catch (error: any) {
      console.error('=== MFA VERIFICATION ERROR ===');
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        name: error?.name,
        fullError: error
      });
      
      if (!timeoutTriggered) {
        clearTimeout(timeoutId);
        
        toast.error('Código incorreto', {
          description: error?.message || 'Verifique o código e tente novamente',
        });
      }
    } finally {
      // GARANTIA ABSOLUTA que o loading será desativado
      console.log('Finally block - ensuring isVerifyingMfa is FALSE...');
      setTimeout(() => {
        console.log('Final safety check - setting isVerifyingMfa to FALSE');
        setIsVerifyingMfa(false);
      }, 100);
    }
  };

  const handleResetPassword = async () => {
    console.log('=== PASSWORD RESET STARTED ===');
    
    if (!validatePassword()) {
      console.log('Password validation failed');
      return;
    }

    console.log('Step 1: Setting reset state...');
    setIsResetting(true);
    
    // Add timeout protection - increase to 45 seconds
    let timeoutTriggered = false;
    const timeoutId = setTimeout(() => {
      console.error('TIMEOUT: Password reset took too long (45s)');
      timeoutTriggered = true;
      setIsResetting(false);
      toast.error('Tempo esgotado', {
        description: 'A operação demorou muito. Tente novamente.',
      });
    }, 45000); // Increased from 30s to 45s
    
    try {
      if (timeoutTriggered) {
        console.log('Timeout already triggered before start, aborting...');
        return;
      }

      console.log('Step 2: Updating user password...');
      const updatePasswordPromise = supabase.auth.updateUser({
        password: newPassword,
      });
      
      const { error } = await Promise.race([
        updatePasswordPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('updateUser timeout')), 15000)
        )
      ]) as any;

      console.log('Password update response:', { error });

      if (timeoutTriggered) {
        console.log('Timeout triggered after password update, aborting...');
        return;
      }

      if (error) {
        console.error('Password update error:', error);
        throw error;
      }

      // Update password_changed_at timestamp
      console.log('Step 3: Updating password timestamp...');
      const getUserPromise = supabase.auth.getUser();
      const { data: { user } } = await Promise.race([
        getUserPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getUser timeout')), 5000)
        )
      ]) as any;
      
      if (user) {
        const updateTimestampPromise = supabase
          .from('profiles')
          .update({ password_changed_at: new Date().toISOString() })
          .eq('id', user.id);
          
        const { error: timestampError } = await Promise.race([
          updateTimestampPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timestamp update timeout')), 10000)
          )
        ]) as any;
        
        if (timestampError) {
          console.error('Timestamp update error:', timestampError);
        } else {
          console.log('Timestamp updated successfully');
        }
      }

      console.log('Step 4: Password reset completed!');
      clearTimeout(timeoutId);
      setResetComplete(true);
      
      setTimeout(() => {
        console.log('Redirecting to auth page...');
        navigate('/auth');
      }, 3000);
      
      console.log('=== PASSWORD RESET COMPLETED ===');
    } catch (error: any) {
      console.error('=== PASSWORD RESET ERROR ===');
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        fullError: error
      });
      
      if (!timeoutTriggered) {
        clearTimeout(timeoutId);
        
        toast.error('Erro ao redefinir senha', {
          description: error.message,
        });
      }
    } finally {
      // GARANTIA ABSOLUTA que o loading será desativado
      console.log('Finally block - ensuring isResetting is FALSE...');
      setTimeout(() => {
        console.log('Final safety check - setting isResetting to FALSE');
        setIsResetting(false);
      }, 100);
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
            Este link de recuperação de senha é inválido ou já expirou.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/auth')} className="w-full">
            Voltar ao Login
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
            Verificação 2FA
          </CardTitle>
          <CardDescription>
            Digite o código do seu autenticador para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Sua conta tem autenticação de dois fatores habilitada. Por segurança, você precisa verificar sua identidade antes de redefinir a senha.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="mfa-code">Código 2FA</Label>
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
              Abra seu aplicativo autenticador e digite o código de 6 dígitos
            </p>
          </div>

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
              'Verificar Código'
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/auth')}
            className="w-full"
          >
            Cancelar
          </Button>
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
