import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSecurityQuestions } from '@/hooks/useSecurityQuestions';

interface SecurityQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREDEFINED_QUESTIONS = [
  'Qual é o nome de solteira da sua mãe?',
  'Qual é o nome do seu primeiro animal de estimação?',
  'Em qual cidade você nasceu?',
  'Qual é o nome da sua escola primária?',
  'Qual é o seu filme favorito?',
  'Qual é a sua comida favorita?',
  'Qual é o nome da sua primeira professora?',
  'Em que rua você morava quando criança?',
];

export function SecurityQuestionsDialog({ open, onOpenChange }: SecurityQuestionsDialogProps) {
  const { setupQuestions, isSettingUp } = useSecurityQuestions();
  const [formData, setFormData] = useState({
    question_1: PREDEFINED_QUESTIONS[0],
    answer_1: '',
    question_2: PREDEFINED_QUESTIONS[1],
    answer_2: '',
    question_3: PREDEFINED_QUESTIONS[2],
    answer_3: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.answer_1 || !formData.answer_2 || !formData.answer_3) {
      return;
    }

    setupQuestions(formData, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Configurar Perguntas de Segurança</DialogTitle>
            <DialogDescription>
              Configure perguntas de segurança para recuperação de conta em caso de perda de acesso ao 2FA.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Question 1 */}
            <div className="space-y-2">
              <Label htmlFor="question_1">Pergunta 1</Label>
              <select
                id="question_1"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.question_1}
                onChange={(e) => setFormData({ ...formData, question_1: e.target.value })}
              >
                {PREDEFINED_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <Input
                id="answer_1"
                type="text"
                placeholder="Sua resposta"
                value={formData.answer_1}
                onChange={(e) => setFormData({ ...formData, answer_1: e.target.value })}
                required
              />
            </div>

            {/* Question 2 */}
            <div className="space-y-2">
              <Label htmlFor="question_2">Pergunta 2</Label>
              <select
                id="question_2"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.question_2}
                onChange={(e) => setFormData({ ...formData, question_2: e.target.value })}
              >
                {PREDEFINED_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <Input
                id="answer_2"
                type="text"
                placeholder="Sua resposta"
                value={formData.answer_2}
                onChange={(e) => setFormData({ ...formData, answer_2: e.target.value })}
                required
              />
            </div>

            {/* Question 3 */}
            <div className="space-y-2">
              <Label htmlFor="question_3">Pergunta 3</Label>
              <select
                id="question_3"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.question_3}
                onChange={(e) => setFormData({ ...formData, question_3: e.target.value })}
              >
                {PREDEFINED_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <Input
                id="answer_3"
                type="text"
                placeholder="Sua resposta"
                value={formData.answer_3}
                onChange={(e) => setFormData({ ...formData, answer_3: e.target.value })}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSettingUp}>
              {isSettingUp ? 'Salvando...' : 'Salvar Perguntas'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}