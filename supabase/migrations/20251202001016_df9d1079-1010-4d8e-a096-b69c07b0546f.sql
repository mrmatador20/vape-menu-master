-- ============================================================================
-- PROTEÇÃO ANTI-AUTOINDICAÇÃO - IMPEDIR USO DO PRÓPRIO CUPOM
-- ============================================================================

-- 1. ADICIONAR CONSTRAINT PARA PREVENIR AUTOINDICAÇÃO NO DISCOUNT_USAGE
-- ============================================================================

-- Criar função para validar que o cupom não pertence ao próprio usuário
CREATE OR REPLACE FUNCTION check_self_referral_usage()
RETURNS TRIGGER AS $$
DECLARE
  coupon_owner_id UUID;
BEGIN
  -- Buscar o user_id do cupom de indicação
  SELECT user_id INTO coupon_owner_id
  FROM public.discounts
  WHERE id = NEW.discount_id
    AND is_referral_reward = true;
  
  -- Se o cupom for de indicação e pertencer ao usuário que está usando
  IF coupon_owner_id IS NOT NULL AND coupon_owner_id = NEW.user_id THEN
    RAISE EXCEPTION 'Você não pode usar seu próprio cupom de indicação';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para validar antes de inserir uso de cupom
DROP TRIGGER IF EXISTS trigger_check_self_referral_usage ON public.discount_usage;

CREATE TRIGGER trigger_check_self_referral_usage
BEFORE INSERT ON public.discount_usage
FOR EACH ROW
EXECUTE FUNCTION check_self_referral_usage();

-- 2. ADICIONAR VALIDAÇÃO SIMILAR PARA REFERRAL CODE NO CHECKOUT
-- ============================================================================

-- Criar função para validar código de indicação no pedido
CREATE OR REPLACE FUNCTION check_self_referral_order()
RETURNS TRIGGER AS $$
DECLARE
  referrer_user_id UUID;
BEGIN
  -- Se não há código de indicação, permitir
  IF NEW.referred_by_code IS NULL OR NEW.referred_by_code = '' THEN
    RETURN NEW;
  END IF;
  
  -- Buscar o user_id do dono do código de indicação
  SELECT id INTO referrer_user_id
  FROM public.profiles
  WHERE referral_code = NEW.referred_by_code;
  
  -- Se o código pertence ao próprio usuário que está fazendo o pedido
  IF referrer_user_id IS NOT NULL AND referrer_user_id = NEW.user_id THEN
    RAISE EXCEPTION 'Você não pode usar seu próprio código de indicação';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para validar antes de criar pedido
DROP TRIGGER IF EXISTS trigger_check_self_referral_order ON public.orders;

CREATE TRIGGER trigger_check_self_referral_order
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION check_self_referral_order();

-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON FUNCTION check_self_referral_usage() IS 
'Valida que um usuário não pode usar seu próprio cupom de indicação. Lança exceção se detectar autoindicação.';

COMMENT ON FUNCTION check_self_referral_order() IS 
'Valida que um usuário não pode usar seu próprio código de indicação em um pedido. Lança exceção se detectar autoindicação.';

COMMENT ON TRIGGER trigger_check_self_referral_usage ON public.discount_usage IS 
'Trigger executado antes de inserir uso de cupom para impedir autoindicação.';

COMMENT ON TRIGGER trigger_check_self_referral_order ON public.orders IS 
'Trigger executado antes de criar pedido para impedir uso do próprio código de indicação.';