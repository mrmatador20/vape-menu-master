DROP FUNCTION IF EXISTS public.validate_discount_code(text);

CREATE FUNCTION public.validate_discount_code(code_input text)
RETURNS TABLE(
  id uuid, code text, type text, value numeric,
  valid_until timestamp with time zone, schedule_type text,
  start_time time without time zone, end_time time without time zone,
  day_of_week integer, max_uses integer, is_active boolean,
  user_id uuid, is_referral_reward boolean,
  is_influencer_coupon boolean, influencer_user_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    id, code, type, value, valid_until, schedule_type,
    start_time, end_time, day_of_week, max_uses, is_active,
    user_id, is_referral_reward,
    is_influencer_coupon, influencer_user_id
  FROM discounts
  WHERE code = code_input
    AND is_active = true;
$function$;

CREATE OR REPLACE FUNCTION public.revert_influencer_coupon_conversion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('cancelled', 'refunded')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'refunded')) THEN
    DELETE FROM public.coupon_conversions
    WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[revert_influencer_coupon_conversion] %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_revert_influencer_coupon_conversion ON public.orders;
CREATE TRIGGER trg_revert_influencer_coupon_conversion
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.revert_influencer_coupon_conversion();