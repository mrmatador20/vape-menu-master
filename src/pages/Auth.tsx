import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMFA } from '@/hooks/useMFA';
import { logActivity } from '@/hooks/useActivityLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header';
import { MFAVerifyDialog } from '@/components/MFAVerifyDialog';
import { validatePassword, getPasswordStrength, getStrengthColor, passwordRequirements } from '@/lib/passwordValidation';
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit';
import { checkPwnedPassword, formatPwnedCount } from '@/lib/pwnedPassword';
import { sendFailedLoginAlert } from '@/lib/securityNotifications';

const Auth = () => {
  const navigate = useNavigate();
  const { listFactors } = useMFA();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [pwnedInfo, setPwnedInfo] = useState<{ isPwned: boolean; count: number } | null>(null);
  const [isCheckingPwned, setIsCheckingPwned] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Check rate limit for signup
        const rateLimitResult = await checkRateLimit({
          action: 'signup',
          maxAttempts: 3,
          windowMinutes: 60,
          blockMinutes: 60,
        });

        if (!rateLimitResult.allowed) {
          toast.error('Limite de tentativas excedido', {
            description: rateLimitResult.message,
          });
          setIsLoading(false);
          return;
        }

        // Validate password strength for signup
        const passwordError = validatePassword(formData.password);
        if (passwordError) {
          toast.error('Senha fraca', {
            description: passwordError
          });
          setIsLoading(false);
          return;
        }

        // Check if password has been compromised
        if (pwnedInfo?.isPwned) {
          toast.error('Senha comprometida detectada', {
            description: `Esta senha foi exposta em ${formatPwnedCount(pwnedInfo.count)} vazamentos de dados. Escolha uma senha diferente.`,
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) throw error;

        // Reset rate limit on successful signup
        await resetRateLimit('signup');

        toast.success('Conta criada com sucesso!', {
          description: 'Você já pode fazer login.'
        });
        setIsSignUp(false);
      } else {
        // Check rate limit for login
        const rateLimitResult = await checkRateLimit({
          action: 'login',
          maxAttempts: 5,
          windowMinutes: 15,
          blockMinutes: 15,
        });

        if (!rateLimitResult.allowed) {
          toast.error('Limite de tentativas excedido', {
            description: rateLimitResult.message,
          });
          setIsLoading(false);
          return;
        }

        // Try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        // If sign in was successful, check if MFA is required
        if (!signInError && signInData.user) {
          // Reset login rate limit on successful login
          await resetRateLimit('login');

          // Check if user has MFA enabled
          const factors = await listFactors();
          
          if (factors.totp && factors.totp.length > 0) {
            // MFA is enabled, show verification dialog
            const activeFactor = factors.totp.find((f: any) => f.status === 'verified');
            if (activeFactor) {
              setMfaFactorId(activeFactor.id);
              setShowMFADialog(true);
              setIsLoading(false);
              return;
            }
          }
          
          // No MFA or not required, proceed with login
          await logActivity('login');
          toast.success('Login realizado com sucesso!');
        } else if (signInError) {
          // Log failed login attempt
          await logActivity('login_failed', { 
            metadata: { error: signInError.message }
          });
          
          // Send security alert for failed login
          try {
            const attemptCount = 5 - (rateLimitResult.remainingAttempts || 0);
            if (attemptCount >= 3) {
              // Send alert after 3 or more failed attempts
              await sendFailedLoginAlert(
                signInData?.user?.id || '',
                formData.email,
                attemptCount
              );
            }
          } catch (notificationError) {
            console.error('Failed to send security alert:', notificationError);
          }
          
          throw signInError;
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao autenticar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFASuccess = async () => {
    await logActivity('login', { 
      metadata: { method: '2FA' }
    });
    toast.success('Login realizado com sucesso!');
    navigate('/');
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-hero flex items-center justify-center py-8">
        <Card className="w-full max-w-md p-8 bg-gradient-card border-border">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isSignUp ? 'Criar Conta' : 'Entrar'}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp 
                ? 'Cadastre-se para fazer pedidos' 
                : 'Entre para acessar sua conta'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-background border-border text-foreground"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={async (e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (isSignUp) {
                      setPasswordStrength(getPasswordStrength(e.target.value));
                      
                      // Check for pwned password (debounced)
                      if (e.target.value.length >= 8) {
                        setIsCheckingPwned(true);
                        setPwnedInfo(null);
                        // Simple debounce
                        setTimeout(async () => {
                          const result = await checkPwnedPassword(e.target.value);
                          setPwnedInfo({ isPwned: result.isPwned, count: result.count });
                          setIsCheckingPwned(false);
                        }, 800);
                      }
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
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              
              {isSignUp && formData.password && (
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

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                isSignUp ? 'Criar Conta' : 'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:text-primary/90 underline block w-full"
            >
              {isSignUp 
                ? 'Já tem uma conta? Entre aqui' 
                : 'Não tem conta? Cadastre-se'}
            </button>
            
            {!isSignUp && (
              <button
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-muted-foreground hover:text-foreground underline block w-full"
              >
                Esqueceu a senha?
              </button>
            )}
          </div>
        </Card>

        {/* MFA Verification Dialog */}
        {mfaFactorId && (
          <MFAVerifyDialog
            open={showMFADialog}
            onOpenChange={setShowMFADialog}
            factorId={mfaFactorId}
            onSuccess={handleMFASuccess}
          />
        )}
      </div>
    </>
  );
};

export default Auth;
