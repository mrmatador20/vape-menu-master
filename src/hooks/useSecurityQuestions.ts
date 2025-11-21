import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Hash function using Web Crypto API
const hashAnswer = async (answer: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(answer.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

interface SecurityQuestions {
  question_1: string;
  question_2: string;
  question_3: string;
}

interface SecurityQuestionsWithAnswers extends SecurityQuestions {
  answer_1: string;
  answer_2: string;
  answer_3: string;
}

export const useSecurityQuestions = () => {
  const queryClient = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ['security-questions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('security_questions')
        .select('question_1, question_2, question_3')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as SecurityQuestions | null;
    },
  });

  const setupQuestions = useMutation({
    mutationFn: async (questionsData: SecurityQuestionsWithAnswers) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [answer1Hash, answer2Hash, answer3Hash] = await Promise.all([
        hashAnswer(questionsData.answer_1),
        hashAnswer(questionsData.answer_2),
        hashAnswer(questionsData.answer_3),
      ]);

      const { error } = await supabase
        .from('security_questions')
        .upsert({
          user_id: user.id,
          question_1: questionsData.question_1,
          answer_1_hash: answer1Hash,
          question_2: questionsData.question_2,
          answer_2_hash: answer2Hash,
          question_3: questionsData.question_3,
          answer_3_hash: answer3Hash,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-questions'] });
      toast({
        title: 'Perguntas de segurança configuradas',
        description: 'Suas perguntas foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao configurar perguntas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const verifyAnswers = async (answers: { answer_1: string; answer_2: string; answer_3: string }): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('security_questions')
        .select('answer_1_hash, answer_2_hash, answer_3_hash')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const [hash1, hash2, hash3] = await Promise.all([
        hashAnswer(answers.answer_1),
        hashAnswer(answers.answer_2),
        hashAnswer(answers.answer_3),
      ]);

      return (
        hash1 === data.answer_1_hash &&
        hash2 === data.answer_2_hash &&
        hash3 === data.answer_3_hash
      );
    } catch (error) {
      console.error('Error verifying answers:', error);
      return false;
    }
  };

  return {
    questions,
    isLoading,
    hasQuestions: !!questions,
    setupQuestions: setupQuestions.mutate,
    isSettingUp: setupQuestions.isPending,
    verifyAnswers,
  };
};