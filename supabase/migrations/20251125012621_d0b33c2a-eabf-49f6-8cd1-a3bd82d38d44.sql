-- Criar tabela para códigos de verificação por email
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'password_change', 'login', etc.
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca rápida
CREATE INDEX idx_email_verification_codes_user_id ON public.email_verification_codes(user_id);
CREATE INDEX idx_email_verification_codes_expires_at ON public.email_verification_codes(expires_at);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver apenas seus próprios códigos
CREATE POLICY "Users can view their own verification codes"
  ON public.email_verification_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: sistema pode inserir códigos
CREATE POLICY "System can insert verification codes"
  ON public.email_verification_codes
  FOR INSERT
  WITH CHECK (true);

-- Política: sistema pode atualizar códigos (marcar como usado)
CREATE POLICY "System can update verification codes"
  ON public.email_verification_codes
  FOR UPDATE
  USING (true);

-- Função para limpar códigos expirados (executar periodicamente)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_verification_codes
  WHERE expires_at < now() - INTERVAL '24 hours';
END;
$$;