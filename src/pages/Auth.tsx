import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMFA } from '@/hooks/useMFA';
import { logActivity } from '@/hooks/useActivityLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { MFAVerifyDialog } from '@/components/MFAVerifyDialog';

const Auth = () => {
  const navigate = useNavigate();
  const { listFactors } = useMFA();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
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
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) throw error;

        toast.success('Conta criada com sucesso!', {
          description: 'Você já pode fazer login.'
        });
        setIsSignUp(false);
      } else {
        // Try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        // If sign in was successful, check if MFA is required
        if (!signInError && signInData.user) {
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
          await logActivity('login_failed', { error: signInError.message });
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
    await logActivity('login', { method: '2FA' });
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
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="bg-background border-border text-foreground"
                placeholder="••••••••"
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
                  Processando...
                </>
              ) : (
                isSignUp ? 'Criar Conta' : 'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:text-primary/90 underline"
            >
              {isSignUp 
                ? 'Já tem uma conta? Entre aqui' 
                : 'Não tem conta? Cadastre-se'}
            </button>
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
