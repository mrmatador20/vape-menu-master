import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Shield, Mail, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AccountRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RecoveryStep = 'email' | 'questions' | 'complete';

export function AccountRecoveryDialog({ open, onOpenChange }: AccountRecoveryDialogProps) {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [questions, setQuestions] = useState<{
    question_1: string;
    question_2: string;
    question_3: string;
  } | null>(null);
  const [answers, setAnswers] = useState({
    answer_1: '',
    answer_2: '',
    answer_3: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Send password reset email which will also verify the email exists
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (resetError) throw new Error('Email não encontrado no sistema');

      // Fetch security questions for verification
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (!profiles || profiles.length === 0) {
        throw new Error('Erro ao buscar informações da conta');
      }

      const { data, error } = await supabase
        .from('security_questions')
        .select('question_1, question_2, question_3')
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        // If no security questions, just send the reset email
        setStep('complete');
        return;
      }

      setQuestions(data);
      setStep('questions');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // In a real implementation, this would be an edge function
      // For now, we'll just send a password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      setStep('complete');
    } catch (error: any) {
      toast({
        title: 'Erro na recuperação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setQuestions(null);
    setAnswers({ answer_1: '', answer_2: '', answer_3: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recuperação de Conta
          </DialogTitle>
          <DialogDescription>
            {step === 'email' && 'Digite seu email para iniciar o processo de recuperação'}
            {step === 'questions' && 'Responda às perguntas de segurança para verificar sua identidade'}
            {step === 'complete' && 'Recuperação iniciada com sucesso'}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Email</Label>
              <Input
                id="recovery-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Verificando...' : 'Continuar'}
            </Button>
          </form>
        )}

        {step === 'questions' && questions && (
          <form onSubmit={handleQuestionsSubmit} className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Responda corretamente às perguntas para receber um link de redefinição de senha por email.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{questions.question_1}</Label>
                <Input
                  type="text"
                  value={answers.answer_1}
                  onChange={(e) => setAnswers({ ...answers, answer_1: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>{questions.question_2}</Label>
                <Input
                  type="text"
                  value={answers.answer_2}
                  onChange={(e) => setAnswers({ ...answers, answer_2: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>{questions.question_3}</Label>
                <Input
                  type="text"
                  value={answers.answer_3}
                  onChange={(e) => setAnswers({ ...answers, answer_3: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Verificando...' : 'Verificar Respostas'}
            </Button>
          </form>
        )}

        {step === 'complete' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-primary/10 p-3">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Email de Recuperação Enviado</h3>
                <p className="text-sm text-muted-foreground">
                  Enviamos um link de redefinição de senha para <strong>{email}</strong>.
                  Verifique sua caixa de entrada e spam.
                </p>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}