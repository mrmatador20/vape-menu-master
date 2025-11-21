-- Tabela para armazenar perguntas e respostas de segurança
CREATE TABLE public.security_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_1 TEXT NOT NULL,
  answer_1_hash TEXT NOT NULL,
  question_2 TEXT NOT NULL,
  answer_2_hash TEXT NOT NULL,
  question_3 TEXT NOT NULL,
  answer_3_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own security questions"
  ON public.security_questions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security questions"
  ON public.security_questions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own security questions"
  ON public.security_questions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own security questions"
  ON public.security_questions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela para tokens de recuperação de conta
CREATE TABLE public.account_recovery_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_recovery_tokens ENABLE ROW LEVEL SECURITY;

-- Policies (users can't access directly, only through functions)
CREATE POLICY "Service role can manage recovery tokens"
  ON public.account_recovery_tokens
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Index para melhor performance
CREATE INDEX idx_recovery_tokens_token ON public.account_recovery_tokens(token);
CREATE INDEX idx_recovery_tokens_expires ON public.account_recovery_tokens(expires_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_security_questions_updated_at
  BEFORE UPDATE ON public.security_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();