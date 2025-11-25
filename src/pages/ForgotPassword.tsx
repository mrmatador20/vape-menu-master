import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('Email enviado com sucesso!', {
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      });
    } catch (error: any) {
      toast.error('Erro ao enviar email', {
        description: error.message || 'Tente novamente mais tarde.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-hero flex items-center justify-center py-8">
        <Card className="w-full max-w-md p-8 bg-gradient-card border-border">
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para login
          </button>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Esqueceu sua senha?
            </h1>
            <p className="text-muted-foreground">
              {emailSent
                ? 'Enviamos um link de recuperação para seu email'
                : 'Digite seu email para receber um link de recuperação'}
            </p>
          </div>

          {!emailSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background border-border text-foreground"
                  placeholder="seu@email.com"
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
                    Enviando...
                  </>
                ) : (
                  'Enviar link de recuperação'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
                <p className="text-sm text-foreground">
                  Se o email <strong>{email}</strong> estiver cadastrado, você receberá
                  um link para redefinir sua senha.
                </p>
              </div>
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Voltar para login
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default ForgotPassword;
