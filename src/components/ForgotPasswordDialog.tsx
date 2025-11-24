import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emailSchema = z.string().email('Email inválido');

export const ForgotPasswordDialog = ({ open, onOpenChange }: ForgotPasswordDialogProps) => {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSendReset = async () => {
    setError('');
    
    // Validate email
    try {
      emailSchema.parse(email);
    } catch (err) {
      setError('Por favor, insira um email válido');
      return;
    }

    setIsSending(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (resetError) throw resetError;

      setEmailSent(true);
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      setError('Erro ao enviar email. Verifique se o email está correto e tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setEmailSent(false);
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {emailSent ? 'Email Enviado!' : 'Esqueceu sua senha?'}
          </DialogTitle>
          <DialogDescription>
            {emailSent 
              ? 'Verifique sua caixa de entrada para redefinir sua senha'
              : 'Digite seu email para receber um link de recuperação de senha'}
          </DialogDescription>
        </DialogHeader>

        {emailSent ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Enviamos um link de recuperação para <strong>{email}</strong>. 
                Verifique sua caixa de entrada e spam.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>O que fazer agora:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Abra o email que enviamos</li>
                <li>Clique no link de recuperação</li>
                <li>Crie uma nova senha forte</li>
                <li>Faça login com sua nova senha</li>
              </ol>
              <p className="mt-4 text-xs">
                <strong>Nota:</strong> O link expira em 1 hora. Se não receber o email em alguns minutos, 
                verifique sua pasta de spam ou tente novamente.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Entendi
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email) {
                    handleSendReset();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enviaremos um link para este email que permitirá redefinir sua senha
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
                onClick={handleSendReset}
                disabled={isSending || !email}
                className="flex-1"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Link'
                )}
              </Button>
            </div>

            <div className="text-xs text-center text-muted-foreground">
              Lembrou sua senha?{' '}
              <button
                onClick={handleClose}
                className="text-primary hover:underline font-medium"
              >
                Voltar ao login
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
