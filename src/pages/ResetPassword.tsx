import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header';
import { validatePassword, getPasswordStrength, getStrengthColor, passwordRequirements } from '@/lib/passwordValidation';
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit';
import { checkPwnedPassword, formatPwnedCount } from '@/lib/pwnedPassword';

// Flag to indicate user is in password reset flow
const RESET_PASSWORD_FLAG = 'password_reset_flow';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [pwnedInfo, setPwnedInfo] = useState<{ isPwned: boolean; count: number } | null>(null);
  const [isCheckingPwned, setIsCheckingPwned] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const checkSession = async () => {
      // Set flag to indicate we're in password reset flow
      localStorage.setItem(RESET_PASSWORD_FLAG, 'true');
      // Dispatch custom event to notify Header component
      window.dispatchEvent(new Event('resetFlowChange'));

      const timeout = setTimeout(() => {
        setIsValidSession(false);
        localStorage.removeItem(RESET_PASSWORD_FLAG);
        toast.error('Sessão expirada', {
          description: 'O link de recuperação expirou ou é inválido.',
        });
      }, 5000);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        clearTimeout(timeout);

        if (error || !session) {
          setIsValidSession(false);
          localStorage.removeItem(RESET_PASSWORD_FLAG);
          window.dispatchEvent(new Event('resetFlowChange'));
          toast.error('Link inválido ou expirado', {
            description: 'Solicite um novo link de recuperação.',
          });
          return;
        }

        // Check if user has MFA enabled
        const { data: mfaData, error: mfaError } = await supabase.auth.mfa.listFactors();
        if (!mfaError && mfaData.totp && mfaData.totp.length > 0) {
          const activeFactor = mfaData.totp.find((f: any) => f.status === 'verified');
          if (activeFactor) {
            setMfaFactorId(activeFactor.id);
            setShowMFAVerification(true);
          }
        }

        setIsValidSession(true);
      } catch (error) {
        clearTimeout(timeout);
        setIsValidSession(false);
        localStorage.removeItem(RESET_PASSWORD_FLAG);
      }
    };

    checkSession();

    // Cleanup flag when component unmounts
    return () => {
      localStorage.removeItem(RESET_PASSWORD_FLAG);
      window.dispatchEvent(new Event('resetFlowChange'));
    };
  }, []);

  const handleMFAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;

    // Check rate limit for password reset MFA
    const rateLimitResult = await checkRateLimit({
      action: 'password_reset_mfa',
      maxAttempts: 5,
      windowMinutes: 15,
      blockMinutes: 15,
    });

    if (!rateLimitResult.allowed) {
      toast.error('Limite de tentativas excedido', {
        description: rateLimitResult.message,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use challengeAndVerify to elevate session to AAL2
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode,
      });

      if (error) throw error;

      // Reset rate limit on successful MFA verification
      await resetRateLimit('password_reset_mfa');

      console.log('MFA verified successfully, hiding verification screen');
      setShowMFAVerification(false);
      toast.success('Código verificado!', {
        description: 'Agora você pode redefinir sua senha.',
      });
    } catch (error: any) {
      console.error('MFA verification failed:', error);
      toast.error('Código incorreto', {
        description: 'Verifique o código e tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast.error('Senha fraca', {
        description: passwordError
      });
      return;
    }

    // Check if password has been compromised
    if (pwnedInfo?.isPwned) {
      toast.error('Senha comprometida detectada', {
        description: `Esta senha foi exposta em ${formatPwnedCount(pwnedInfo.count)} vazamentos de dados. Escolha uma senha diferente.`,
      });
      return;
    }

    // Check rate limit for password reset
    const rateLimitResult = await checkRateLimit({
      action: 'password_reset',
      maxAttempts: 3,
      windowMinutes: 60,
      blockMinutes: 60,
    });

    if (!rateLimitResult.allowed) {
      toast.error('Limite de tentativas excedido', {
        description: rateLimitResult.message,
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      // Reset rate limit on successful password reset
      await resetRateLimit('password_reset');

      // Remove reset flag and sign out after successful password reset
      localStorage.removeItem(RESET_PASSWORD_FLAG);
      window.dispatchEvent(new Event('resetFlowChange'));
      await supabase.auth.signOut();

      toast.success('Senha redefinida com sucesso!', {
        description: 'Faça login com sua nova senha.',
      });

      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error: any) {
      toast.error('Erro ao redefinir senha', {
        description: error.message || 'Tente novamente mais tarde.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-hero flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (isValidSession === false) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-hero flex items-center justify-center py-8">
          <Card className="w-full max-w-md p-8 bg-gradient-card border-border">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold text-foreground">
                Link Inválido ou Expirado
              </h1>
              <p className="text-muted-foreground">
                O link de recuperação de senha expirou ou é inválido.
              </p>
              <Button
                onClick={() => navigate('/forgot-password')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                Solicitar novo link
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (showMFAVerification) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-hero flex items-center justify-center py-8">
          <Card className="w-full max-w-md p-8 bg-gradient-card border-border">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Verificação 2FA Necessária
              </h1>
              <p className="text-muted-foreground">
                Para garantir a segurança da sua conta, digite o código do seu aplicativo autenticador
              </p>
            </div>

            <form onSubmit={handleMFAVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfaCode" className="text-foreground">
                  Código 2FA
                </Label>
                <Input
                  id="mfaCode"
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  required
                  maxLength={6}
                  className="bg-background border-border text-foreground text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Confirmar código MFA'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Problemas com o autenticador?{' '}
                <button
                  onClick={() => navigate('/auth')}
                  className="text-primary hover:text-primary/90 underline"
                >
                  Entre em contato com o suporte
                </button>
              </p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-hero flex items-center justify-center py-8">
        <Card className="w-full max-w-md p-8 bg-gradient-card border-border">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Redefinir Senha
            </h1>
            <p className="text-muted-foreground">
              Digite sua nova senha abaixo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={async (e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setPasswordStrength(getPasswordStrength(e.target.value));
                    
                    // Check for pwned password
                    if (e.target.value.length >= 8) {
                      setIsCheckingPwned(true);
                      setPwnedInfo(null);
                      setTimeout(async () => {
                        const result = await checkPwnedPassword(e.target.value);
                        setPwnedInfo({ isPwned: result.isPwned, count: result.count });
                        setIsCheckingPwned(false);
                      }, 800);
                    }
                  }}
                  required
                  minLength={8}
                  className="bg-background border-border text-foreground pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getStrengthColor(passwordStrength)}`}
                        style={{
                          width: passwordStrength === 'weak' ? '25%' :
                                 passwordStrength === 'medium' ? '50%' :
                                 passwordStrength === 'strong' ? '75%' :
                                 passwordStrength === 'very-strong' ? '100%' : '0%'
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">
                      {passwordStrength === 'weak' ? 'Fraca' :
                       passwordStrength === 'medium' ? 'Média' :
                       passwordStrength === 'strong' ? 'Forte' :
                       passwordStrength === 'very-strong' ? 'Muito Forte' : ''}
                    </span>
                  </div>

                  {/* Pwned Password Warning */}
                  {isCheckingPwned && (
                    <Alert className="bg-muted/50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <AlertDescription className="text-xs">
                        Verificando segurança da senha...
                      </AlertDescription>
                    </Alert>
                  )}

                  {pwnedInfo?.isPwned && !isCheckingPwned && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>⚠️ Senha comprometida!</strong><br/>
                        Esta senha foi exposta em <strong>{formatPwnedCount(pwnedInfo.count)}</strong> vazamentos de dados. 
                        Escolha uma senha diferente para proteger sua conta.
                      </AlertDescription>
                    </Alert>
                  )}

                  {pwnedInfo && !pwnedInfo.isPwned && !isCheckingPwned && (
                    <Alert className="bg-green-500/10 border-green-500/20">
                      <AlertDescription className="text-xs text-green-700 dark:text-green-400">
                        ✓ Senha segura - não encontrada em vazamentos conhecidos
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">Requisitos da senha:</p>
                    {passwordRequirements.map((req) => (
                      <div key={req.id} className="flex items-center gap-2">
                        <span className={req.regex.test(formData.password) ? 'text-green-500' : 'text-muted-foreground'}>
                          {req.regex.test(formData.password) ? '✓' : '○'}
                        </span>
                        <span>{req.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirmar Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  minLength={8}
                  className="bg-background border-border text-foreground pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                'Redefinir senha'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
};

export default ResetPassword;
