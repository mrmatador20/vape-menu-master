-- ============================================================================
-- SISTEMA DE NÍVEIS/TIERS PARA PROGRAMA DE INDICAÇÕES
-- ============================================================================

-- 1. CRIAR TABELA DE TIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.referral_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  min_referrals INTEGER NOT NULL,
  points_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  display_order INTEGER NOT NULL DEFAULT 0,
  badge_color TEXT NOT NULL DEFAULT '#6B7280',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_min_referrals_positive CHECK (min_referrals >= 0),
  CONSTRAINT check_multiplier_positive CHECK (points_multiplier >= 1.00)
);

-- 2. ADICIONAR COLUNA DE TIER À TABELA REFERRAL_POINTS
-- ============================================================================

ALTER TABLE public.referral_points
ADD COLUMN IF NOT EXISTS current_tier_id UUID REFERENCES public.referral_tiers(id),
ADD COLUMN IF NOT EXISTS total_successful_referrals INTEGER NOT NULL DEFAULT 0;

-- 3. INSERIR TIERS PADRÃO
-- ============================================================================

INSERT INTO public.referral_tiers (name, min_referrals, points_multiplier, display_order, badge_color)
VALUES 
  ('Bronze', 0, 1.00, 1, '#CD7F32'),
  ('Prata', 5, 1.25, 2, '#C0C0C0'),
  ('Ouro', 15, 1.50, 3, '#FFD700'),
  ('Platina', 30, 2.00, 4, '#E5E4E2'),
  ('Diamante', 50, 2.50, 5, '#B9F2FF')
ON CONFLICT (name) DO NOTHING;

-- 4. FUNÇÃO PARA CALCULAR E ATUALIZAR TIER DO USUÁRIO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_tier(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_successful_referrals INTEGER;
  v_new_tier_id UUID;
BEGIN
  -- Contar indicações bem-sucedidas (pedidos confirmados/delivered)
  SELECT COUNT(DISTINCT o.id) INTO v_successful_referrals
  FROM public.orders o
  INNER JOIN public.profiles p ON p.referral_code = o.referred_by_code
  WHERE p.id = p_user_id
    AND o.status IN ('confirmed', 'delivered')
    AND o.referral_points_awarded = true;

  -- Determinar tier apropriado (maior tier que o usuário qualifica)
  SELECT id INTO v_new_tier_id
  FROM public.referral_tiers
  WHERE min_referrals <= v_successful_referrals
    AND is_active = true
  ORDER BY min_referrals DESC
  LIMIT 1;

  -- Atualizar tier e contagem de indicações
  UPDATE public.referral_points
  SET 
    current_tier_id = v_new_tier_id,
    total_successful_referrals = v_successful_referrals,
    updated_at = now()
  WHERE user_id = p_user_id;

  RAISE NOTICE '[update_user_tier] User % updated to tier % with % referrals', 
    p_user_id, v_new_tier_id, v_successful_referrals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. ATUALIZAR FUNÇÃO DE PROCESSAMENTO DE INDICAÇÃO PARA USAR MULTIPLICADOR
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_referral_on_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_points_to_award INTEGER;
  v_base_points INTEGER;
  v_current_balance INTEGER;
  v_current_total INTEGER;
  v_points_config TEXT;
  v_tier_multiplier NUMERIC(3,2);
BEGIN
  -- Verifica se o status mudou para 'confirmed' ou 'delivered' 
  -- e se o pedido tem um código de indicação
  -- e se os pontos ainda não foram concedidos
  IF (NEW.status IN ('confirmed', 'delivered') 
      AND OLD.status NOT IN ('confirmed', 'delivered')
      AND NEW.referred_by_code IS NOT NULL 
      AND NEW.referred_by_code != ''
      AND NEW.referral_points_awarded = false) THEN
    
    -- Buscar configuração de pontos por indicação
    SELECT value INTO v_points_config
    FROM public.settings
    WHERE key = 'referral_points_per_order'
    LIMIT 1;
    
    -- Usar valor configurado ou padrão de 10 pontos
    v_base_points := COALESCE(v_points_config::INTEGER, 10);
    
    -- 1. Encontrar o dono do código de indicação
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = NEW.referred_by_code
    LIMIT 1;
    
    -- Se o código não existe ou é auto-referência, não fazer nada
    IF v_referrer_id IS NULL OR v_referrer_id = NEW.user_id THEN
      RETURN NEW;
    END IF;
    
    -- 2. Obter multiplicador do tier atual do usuário
    SELECT COALESCE(rt.points_multiplier, 1.00) INTO v_tier_multiplier
    FROM public.referral_points rp
    LEFT JOIN public.referral_tiers rt ON rt.id = rp.current_tier_id
    WHERE rp.user_id = v_referrer_id;
    
    -- Se não tem tier, usar multiplicador 1.0
    v_tier_multiplier := COALESCE(v_tier_multiplier, 1.00);
    
    -- 3. Calcular pontos com multiplicador do tier
    v_points_to_award := FLOOR(v_base_points * v_tier_multiplier);
    
    -- 4. Obter saldo atual do indicador
    SELECT points_balance, total_earned INTO v_current_balance, v_current_total
    FROM public.referral_points
    WHERE user_id = v_referrer_id;
    
    -- Se não existe registro, criar com valores zerados
    IF v_current_balance IS NULL THEN
      v_current_balance := 0;
      v_current_total := 0;
    END IF;
    
    -- 5. Atualizar pontos do indicador
    INSERT INTO public.referral_points (user_id, points_balance, total_earned, total_redeemed)
    VALUES (v_referrer_id, v_current_balance + v_points_to_award, v_current_total + v_points_to_award, 0)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      points_balance = referral_points.points_balance + v_points_to_award,
      total_earned = referral_points.total_earned + v_points_to_award,
      updated_at = now();
    
    -- 6. Criar registro de transação
    INSERT INTO public.referral_transactions (
      user_id, 
      transaction_type, 
      points_amount, 
      related_user_id, 
      related_order_id,
      notes
    )
    VALUES (
      v_referrer_id,
      'earned',
      v_points_to_award,
      NEW.user_id,
      NEW.id,
      'Indicação confirmada - Pedido #' || substring(NEW.id::text from 1 for 8) || 
      ' (Tier Multiplier: ' || v_tier_multiplier || 'x)'
    );
    
    -- 7. Atualizar tier do usuário
    PERFORM public.update_user_tier(v_referrer_id);
    
    -- 8. Marcar pedido como pontos concedidos
    NEW.referral_points_awarded := true;
    
    RAISE NOTICE '[process_referral_on_confirmation] Points awarded: % (base: %, multiplier: %x) to user %', 
      v_points_to_award, v_base_points, v_tier_multiplier, v_referrer_id;
    
  END IF;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error mas não bloqueia a atualização do pedido
  RAISE WARNING '[process_referral_on_confirmation] Error processing referral: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. RLS POLICIES PARA REFERRAL_TIERS
-- ============================================================================

ALTER TABLE public.referral_tiers ENABLE ROW LEVEL SECURITY;

-- Público pode ver tiers ativos
CREATE POLICY "Public can view active tiers"
ON public.referral_tiers
FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins podem gerenciar tiers
CREATE POLICY "Admins can manage tiers"
ON public.referral_tiers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_referral_tiers_min_referrals 
ON public.referral_tiers(min_referrals DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_referral_points_tier 
ON public.referral_points(current_tier_id);

-- 8. TRIGGER PARA UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_referral_tiers_updated_at
BEFORE UPDATE ON public.referral_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 9. ATUALIZAR TIERS DE TODOS OS USUÁRIOS EXISTENTES
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT user_id FROM public.referral_points
  LOOP
    PERFORM public.update_user_tier(user_record.user_id);
  END LOOP;
END $$;

-- 10. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE public.referral_tiers IS 
'Define os níveis/tiers do programa de indicações com multiplicadores de pontos progressivos';

COMMENT ON FUNCTION public.update_user_tier(UUID) IS 
'Calcula e atualiza o tier de um usuário baseado no número de indicações bem-sucedidas';

COMMENT ON COLUMN public.referral_tiers.points_multiplier IS 
'Multiplicador aplicado aos pontos base (ex: 1.5 = 50% de bônus)';

COMMENT ON COLUMN public.referral_points.total_successful_referrals IS 
'Contador de indicações confirmadas/entregues para determinar tier';