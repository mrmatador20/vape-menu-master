import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMFA } from '@/hooks/useMFA';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { logActivity } from '@/hooks/useActivityLogs';
import { useAuthState } from '@/context/AuthStateContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header';
import { MFAVerificationGate } from '@/components/MFAVerificationGate';
import { validatePassword, getPasswordStrength, getStrengthColor, passwordRequirements } from '@/lib/passwordValidation';
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit';
import { checkPwnedPassword, formatPwnedCount } from '@/lib/pwnedPassword';
import { usePageMeta } from '@/hooks/usePageMeta';

const Auth = () => {
  usePageMeta({ title: 'Entrar ou Cadastrar - Fox Velour', description: 'Acesse sua conta Fox Velour ou crie uma nova para gerenciar pedidos e endereços.', path: '/auth' });

  const navigate = useNavigate();
  const { listFactors } = useMFA();
  const { checkAuthRequires2FA, rememberDevice: saveRememberDevice } = useAuthGuard();
  const { setAuthState } = useAuthState();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [pwnedInfo, setPwnedInfo] = useState<{ isPwned: boolean; count: number } | null>(null);
  const [isCheckingPwned, setIsCheckingPwned] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  // 2FA verification state
  const [show2FAGate, setShow2FAGate] = useState(false);
  const [challengeData, setChallengeData] = useState<{
    factorId: string;
    challengeId: string;
    operation: string;
    createdAt: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CRITICAL: Use flushSync to force synchronous state update
    // This ensures the navbar is disabled BEFORE any async operations
    flushSync(() => {
      setIsLoading(true);
      setAuthState('AUTHENTICATING');
    });

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
            emailRedirectTo: `${window.location.origin}/`,
          }
        });

        if (error) throw error;

        // Reset rate limit on successful signup
        await resetRateLimit('signup');

        toast.success('Conta criada com sucesso!', {
          description: 'Você já pode fazer login.'
        });
        setIsSignUp(false);
        setAuthState('IDLE');
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

        if (signInError) {
          await logActivity('login_failed', { 
            metadata: { error: signInError.message }
          });
          throw signInError;
        }

        // Login successful - reset rate limit
        await resetRateLimit('login');
        await logActivity('login');
        
        console.log('🔐 Login successful, checking if 2FA is required');
        toast.success('Credenciais validadas!');
        
        // Check if 2FA verification is required
        const authCheck = await checkAuthRequires2FA();
        
        if (!authCheck.has2FAEnabled) {
          // No 2FA, go directly to home
          console.log('🔐 No 2FA enabled, proceeding to home');
          sessionStorage.setItem('2fa_verified', 'true');
          setAuthState('AUTHENTICATED');
          navigate('/');
          return;
        }
        
        if (authCheck.isDeviceRemembered) {
          // Device is remembered, skip 2FA
          console.log('🔐 Device is trusted, skipping 2FA');
          sessionStorage.setItem('2fa_verified', 'true');
          setAuthState('AUTHENTICATED');
          navigate('/');
          return;
        }
        
        // 2FA is required - show verification gate on login page
        console.log('🔐 2FA required, showing verification gate');
        setAuthState('AWAITING_2FA');
        
        const totpFactor = authCheck.factors?.[0];
        if (!totpFactor) {
          toast.error('Erro na configuração 2FA');
          setIsLoading(false);
          return;
        }

        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id
        });

        if (challengeError) {
          console.error('🔐 Failed to create MFA challenge:', challengeError);
          toast.error('Erro ao criar verificação 2FA');
          setIsLoading(false);
          return;
        }

        setChallengeData({
          factorId: totpFactor.id,
          challengeId: challenge.id,
          operation: 'login',
          createdAt: Date.now(),
        });
        setShow2FAGate(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao autenticar');
      // CRITICAL: Use flushSync to immediately reset state on error
      flushSync(() => {
        setAuthState('IDLE');
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handle2FASuccess = async (deviceRemembered: boolean) => {
    console.log('🔐 2FA verification successful on login page');
    
    // Save remembered device if user chose to
    const shouldRemember = deviceRemembered || rememberDevice;
    if (shouldRemember) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveRememberDevice(user.id);
      }
    }
    
    // Mark as verified and navigate to home
    sessionStorage.setItem('2fa_verified', 'true');
    setAuthState('AUTHENTICATED');
    setShow2FAGate(false);
    toast.success('Login realizado com sucesso!');
    navigate('/');
  };

  const handle2FACancel = async () => {
    console.log('🔐 User cancelled 2FA verification');
    setShow2FAGate(false);
    setChallengeData(null);
    setAuthState('IDLE');
    await supabase.auth.signOut();
    toast.error('Verificação 2FA cancelada');
  };

  const handle2FAExpired = async () => {
    console.log('🔐 2FA challenge expired, creating new one');
    toast.error('Código expirado', {
      description: 'Gerando novo código de verificação...',
    });

    // Create new challenge
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];
    if (!totpFactor) return;

    const { data: challenge, error } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id
    });

    if (error) {
      toast.error('Erro ao gerar novo código');
      handle2FACancel();
      return;
    }

    setChallengeData({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      operation: 'login',
      createdAt: Date.now(),
    });
  };

  // If showing 2FA gate, render only that
  if (show2FAGate && challengeData) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-hero flex items-center justify-center">
          <MFAVerificationGate
            open={true}
            operation="login"
            operationLabel="entrar na sua conta"
            challengeData={challengeData}
            onVerified={handle2FASuccess}
            onCancel={handle2FACancel}
            onExpired={handle2FAExpired}
            showRememberOption={!rememberDevice}
            presetRememberDevice={rememberDevice}
          />
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
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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

            {/* Remember Device Checkbox - Always visible for login */}
            {!isSignUp && (
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="remember-device"
                  checked={rememberDevice}
                  onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="remember-device"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Lembrar este dispositivo por 30 dias
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    ⓘ Não pediremos código 2FA neste dispositivo por 30 dias. Recomendado apenas para dispositivos pessoais.
                  </p>
                </div>
              </div>
            )}

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
      </div>
    </>
  );
};

export default Auth;
