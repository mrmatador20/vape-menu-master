
-- Atualizar função de processamento de indicações para ler pontos da configuração
CREATE OR REPLACE FUNCTION public.process_referral_on_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verifica se o status mudou para 'confirmed' ou 'delivered' 
  -- e se o pedido tem um código de indicação
  -- e se os pontos ainda não foram concedidos
  IF (NEW.status IN ('confirmed', 'delivered') 
      AND OLD.status NOT IN ('confirmed', 'delivered')
      AND NEW.referred_by_code IS NOT NULL 
      AND NEW.referred_by_code != ''
      AND NEW.referral_points_awarded = false) THEN
    
    -- Processar a indicação usando a lógica inline
    DECLARE
      v_referrer_id UUID;
      v_points_to_award INTEGER;
      v_current_balance INTEGER;
      v_current_total INTEGER;
      v_points_config TEXT;
    BEGIN
      -- Buscar configuração de pontos por indicação
      SELECT value INTO v_points_config
      FROM public.settings
      WHERE key = 'referral_points_per_order'
      LIMIT 1;
      
      -- Usar valor configurado ou padrão de 10 pontos
      v_points_to_award := COALESCE(v_points_config::INTEGER, 10);
      
      -- 1. Encontrar o dono do código de indicação
      SELECT id INTO v_referrer_id
      FROM public.profiles
      WHERE referral_code = NEW.referred_by_code
      LIMIT 1;
      
      -- Se o código não existe ou é auto-referência, não fazer nada
      IF v_referrer_id IS NULL OR v_referrer_id = NEW.user_id THEN
        RETURN NEW;
      END IF;
      
      -- 2. Obter saldo atual do indicador
      SELECT points_balance, total_earned INTO v_current_balance, v_current_total
      FROM public.referral_points
      WHERE user_id = v_referrer_id;
      
      -- Se não existe registro, criar com valores zerados
      IF v_current_balance IS NULL THEN
        v_current_balance := 0;
        v_current_total := 0;
      END IF;
      
      -- 3. Atualizar pontos do indicador
      INSERT INTO public.referral_points (user_id, points_balance, total_earned, total_redeemed)
      VALUES (v_referrer_id, v_current_balance + v_points_to_award, v_current_total + v_points_to_award, 0)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        points_balance = referral_points.points_balance + v_points_to_award,
        total_earned = referral_points.total_earned + v_points_to_award,
        updated_at = now();
      
      -- 4. Criar registro de transação
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
        'Indicação confirmada - Pedido #' || substring(NEW.id::text from 1 for 8)
      );
      
      -- 5. Marcar pedido como pontos concedidos
      NEW.referral_points_awarded := true;
      
      RAISE NOTICE '[process_referral_on_confirmation] Points awarded: % to user %', v_points_to_award, v_referrer_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error mas não bloqueia a atualização do pedido
      RAISE WARNING '[process_referral_on_confirmation] Error processing referral: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;
