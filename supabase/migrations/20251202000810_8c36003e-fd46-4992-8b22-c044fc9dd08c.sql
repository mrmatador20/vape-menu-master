-- ============================================================================
-- PROTEÇÃO RLS DE PONTA A PONTA - SISTEMA DE CUPONS E INDICAÇÕES
-- ============================================================================

-- 1. REFORÇAR POLÍTICAS RLS DA TABELA DISCOUNTS
-- ============================================================================

-- Remover políticas antigas que podem ser muito permissivas
DROP POLICY IF EXISTS "Public can view active discounts" ON public.discounts;
DROP POLICY IF EXISTS "Users can view their own referral coupons" ON public.discounts;

-- Política 1: Admins podem gerenciar todos os descontos (já existe)
-- Política 2: Usuários podem ver APENAS seus próprios cupons de indicação
CREATE POLICY "Users can view only their own referral coupons"
ON public.discounts
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid() AND is_referral_reward = true)
);

-- Política 3: Público pode ver descontos gerais ativos (não-referral)
CREATE POLICY "Public can view active general discounts"
ON public.discounts
FOR SELECT
TO authenticated
USING (
  (is_referral_reward = false OR is_referral_reward IS NULL)
  AND is_active = true 
  AND (valid_until IS NULL OR valid_until >= now())
);

-- Política 4: Usuários NÃO podem criar cupons manualmente (apenas via sistema)
-- Política 5: Usuários NÃO podem atualizar cupons (apenas o sistema/admin)
-- Política 6: Usuários NÃO podem deletar cupons (apenas o sistema/admin)

-- 2. REFORÇAR POLÍTICAS RLS DA TABELA REFERRAL_POINTS
-- ============================================================================

-- Garantir que políticas existentes estejam corretas
DROP POLICY IF EXISTS "Users can view their own points" ON public.referral_points;

-- Política: Usuários veem APENAS seus próprios pontos
CREATE POLICY "Users can view only their own points"
ON public.referral_points
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role pode atualizar pontos (já existe)
-- Admins podem ver todos os pontos (já existe)

-- 3. REFORÇAR POLÍTICAS RLS DA TABELA REFERRAL_TRANSACTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.referral_transactions;

-- Política: Usuários veem APENAS suas próprias transações
CREATE POLICY "Users can view only their own transactions"
ON public.referral_transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role pode inserir transações (já existe)
-- Admins podem ver todas as transações (já existe)

-- 4. REFORÇAR POLÍTICAS RLS DA TABELA REFERRAL_REWARDS
-- ============================================================================

-- Política: Público pode ver apenas recompensas ativas (já existe)
-- Política: Admins podem gerenciar recompensas (já existe)

-- 5. ADICIONAR ÍNDICES PARA PERFORMANCE E SEGURANÇA
-- ============================================================================

-- Índice para melhorar performance de queries de cupons por usuário
CREATE INDEX IF NOT EXISTS idx_discounts_user_referral 
ON public.discounts(user_id, is_referral_reward) 
WHERE is_referral_reward = true;

-- Índice para melhorar performance de queries de pontos por usuário
CREATE INDEX IF NOT EXISTS idx_referral_points_user 
ON public.referral_points(user_id);

-- Índice para melhorar performance de queries de transações por usuário
CREATE INDEX IF NOT EXISTS idx_referral_transactions_user 
ON public.referral_transactions(user_id);

-- 6. ADICIONAR CONSTRAINT DE SEGURANÇA
-- ============================================================================

-- Garantir que cupons de indicação SEMPRE tenham user_id
ALTER TABLE public.discounts
ADD CONSTRAINT check_referral_has_user
CHECK (
  (is_referral_reward = false OR is_referral_reward IS NULL) 
  OR 
  (is_referral_reward = true AND user_id IS NOT NULL)
);

-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON POLICY "Users can view only their own referral coupons" ON public.discounts IS 
'Usuários autenticados podem ver APENAS seus próprios cupons de indicação. Cupons de outros usuários são completamente invisíveis.';

COMMENT ON POLICY "Public can view active general discounts" ON public.discounts IS 
'Descontos gerais (não-referral) ativos podem ser vistos por todos usuários autenticados.';

COMMENT ON CONSTRAINT check_referral_has_user ON public.discounts IS 
'Garante que todo cupom de indicação tenha um user_id associado, prevenindo cupons órfãos.';