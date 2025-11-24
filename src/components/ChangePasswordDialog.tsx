import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Eye, EyeOff, Check, X, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logActivity } from '@/hooks/useActivityLogs';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MFAFactor {
  id: string;
  status: string;
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
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

export const ChangePasswordDialog = ({ open, onOpenChange }: ChangePasswordDialogProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // MFA verification states
  const [needsMfaVerification, setNeedsMfaVerification] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

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
      passwordSchema.parse({ currentPassword, newPassword, confirmPassword });
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

  const handleChangePassword = async () => {
    console.log('=== PASSWORD CHANGE STARTED ===');
    console.log('Step 1: Validating form...');
    
    if (!validatePassword()) {
      console.log('Validation failed, stopping process');
      return;
    }

    console.log('Step 2: Checking if user has MFA enabled...');
    
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const totpFactor = data?.totp?.find((f: MFAFactor) => f.status === 'verified');
      
      console.log('MFA check result:', { 
        hasMFA: !!totpFactor,
        factorId: totpFactor?.id 
      });
      
      if (totpFactor) {
        console.log('User has MFA - requiring verification before password change');
        setMfaFactorId(totpFactor.id);
        setNeedsMfaVerification(true);
        return; // Stop here and wait for MFA verification
      }
      
      // No MFA - proceed directly to password change
      console.log('No MFA detected - proceeding with password change');
      await performPasswordChange();
      
    } catch (error: any) {
      console.error('Error checking MFA status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar o status do MFA',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyMfaForPasswordChange = async () => {
    console.log('=== MFA VERIFICATION FOR PASSWORD CHANGE STARTED ===');
    
    if (mfaCode.length !== 6) {
      console.log('Invalid code length:', mfaCode.length);
      toast({
        title: 'Código inválido',
        description: 'Digite um código de 6 dígitos',
        variant: 'destructive',
      });
      return;
    }

    console.log('Step 1: Setting verification state to true...');
    setIsVerifyingMfa(true);
    
    // Add timeout protection - max 30 seconds
    const timeoutId = setTimeout(() => {
      console.error('TIMEOUT: MFA verification took too long (30s)');
      setIsVerifyingMfa(false);
      toast({
        title: 'Tempo esgotado',
        description: 'A verificação demorou muito. Tente novamente.',
        variant: 'destructive',
      });
    }, 30000);

    try {
      console.log('Step 2: Starting MFA verification for password change...', { factorId: mfaFactorId });
      
      // Create challenge
      console.log('Step 3: Creating MFA challenge...');
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });

      console.log('Challenge result:', {
        hasData: !!challengeData,
        challengeId: challengeData?.id,
        error: challengeError?.message
      });

      if (challengeError) {
        console.error('Challenge error:', challengeError);
        throw challengeError;
      }

      if (!challengeData?.id) {
        console.error('No challenge ID in response');
        throw new Error('No challenge ID returned');
      }

      // Verify code
      console.log('Step 4: Verifying MFA code...', { challengeId: challengeData.id });
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      console.log('Verify result:', {
        hasData: !!verifyData,
        error: verifyError?.message
      });

      if (verifyError) {
        console.error('Verify error:', verifyError);
        throw verifyError;
      }

      console.log('Step 5: MFA verified successfully - session elevated to AAL2');
      clearTimeout(timeoutId);
      setIsVerifyingMfa(false);
      setNeedsMfaVerification(false);
      
      toast({
        title: 'Código verificado!',
        description: 'Alterando sua senha...',
      });

      console.log('Step 6: Proceeding to password change...');
      // Now perform password change with elevated session
      await performPasswordChange();
      
      console.log('=== MFA VERIFICATION FOR PASSWORD CHANGE COMPLETED ===');

    } catch (error: any) {
      console.error('=== MFA VERIFICATION ERROR ===');
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        fullError: error
      });
      
      clearTimeout(timeoutId);
      setIsVerifyingMfa(false);
      
      toast({
        title: 'Código incorreto',
        description: error?.message || 'Verifique o código e tente novamente',
        variant: 'destructive',
      });
    }
  };

  const performPasswordChange = async () => {
    console.log('=== PERFORMING PASSWORD CHANGE ===');
    console.log('Step 1: Setting loading state to TRUE');
    setIsChanging(true);
    
    // Add timeout protection - max 30 seconds
    let timeoutTriggered = false;
    const timeoutId = setTimeout(() => {
      console.error('TIMEOUT: Password change took too long (30s)');
      timeoutTriggered = true;
      setIsChanging(false);
      toast({
        title: 'Tempo esgotado',
        description: 'A operação demorou muito. Por favor, tente novamente.',
        variant: 'destructive',
      });
    }, 30000);
    
    try {
      console.log('Step 2: Getting authenticated user...');
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      console.log('User fetch result:', { 
        userId: user?.id, 
        email: user?.email,
        error: getUserError 
      });
      
      if (timeoutTriggered) {
        console.log('Timeout triggered, aborting...');
        return;
      }
      
      if (getUserError) {
        console.error('Error getting user:', getUserError);
        throw getUserError;
      }
      
      if (!user?.email) {
        console.error('No user or email found');
        throw new Error('Usuário não autenticado');
      }

      console.log('Step 3: Updating password...');
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      console.log('Password update result:', { 
        success: !!updateData.user,
        error: updateError?.message,
        errorStatus: updateError?.status 
      });

      if (timeoutTriggered) {
        console.log('Timeout triggered after update, aborting...');
        return;
      }

      if (updateError) {
        console.error('Password update failed:', updateError);
        throw updateError;
      }

      console.log('Step 4: Password updated successfully, updating timestamp...');
      const { error: timestampError } = await supabase
        .from('profiles')
        .update({ password_changed_at: new Date().toISOString() })
        .eq('id', user.id);

      if (timestampError) {
        console.error('Failed to update password timestamp:', timestampError);
      } else {
        console.log('Timestamp updated successfully');
      }

      console.log('Step 5: Logging activity...');
      await logActivity('password_changed');

      console.log('Step 6: Password change completed successfully!');
      clearTimeout(timeoutId);
      setIsChanging(false);

      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Sua senha foi atualizada. Use a nova senha no próximo login.',
      });

      console.log('Step 7: Closing dialog...');
      handleClose();
      
      console.log('=== PASSWORD CHANGE COMPLETED ===');
    } catch (error: any) {
      console.error('=== PASSWORD CHANGE ERROR ===');
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        fullError: error
      });
      
      if (!timeoutTriggered) {
        clearTimeout(timeoutId);
        setIsChanging(false);
        
        toast({
          title: 'Erro ao alterar senha',
          description: error.message || 'Ocorreu um erro inesperado',
          variant: 'destructive',
        });
      }
    } finally {
      // GARANTIA ABSOLUTA que o loading será desativado
      console.log('Finally block - ensuring isChanging is FALSE...');
      if (!timeoutTriggered) {
        setTimeout(() => {
          console.log('Final safety check - setting isChanging to FALSE');
          setIsChanging(false);
        }, 100);
      }
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
    setNeedsMfaVerification(false);
    setMfaCode('');
    setMfaFactorId('');
    setIsVerifyingMfa(false);
    onOpenChange(false);
  };

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: newPassword.length >= 8 },
    { label: 'Uma letra maiúscula', met: /[A-Z]/.test(newPassword) },
    { label: 'Uma letra minúscula', met: /[a-z]/.test(newPassword) },
    { label: 'Um número', met: /[0-9]/.test(newPassword) },
    { label: 'Um caractere especial', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {needsMfaVerification ? (
              <>
                <Shield className="h-5 w-5 text-primary" />
                Verificação 2FA
              </>
            ) : (
              <>
                <Key className="h-5 w-5 text-primary" />
                Alterar Senha
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {needsMfaVerification 
              ? 'Para garantir a segurança da sua conta, digite o código do seu autenticador'
              : 'Digite sua senha atual e escolha uma nova senha forte'
            }
          </DialogDescription>
        </DialogHeader>

        {needsMfaVerification ? (
          // MFA Verification Screen
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Sua conta tem autenticação de dois fatores habilitada. Por segurança, você precisa verificar sua identidade antes de alterar a senha.
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleVerifyMfaForPasswordChange}
                disabled={isVerifyingMfa || mfaCode.length !== 6}
                className="flex-1"
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
            </div>
          </div>
        ) : (
          // Password Change Form
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={errors.currentPassword ? 'border-destructive' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-destructive">{errors.currentPassword}</p>
              )}
            </div>

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

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={isChanging || !currentPassword || !newPassword || !confirmPassword}
                className="flex-1"
              >
                {isChanging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
