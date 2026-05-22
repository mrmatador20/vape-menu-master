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
  WHERE LOWER(code) = LOWER(TRIM(code_input))
    AND is_active = true
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO authenticated, anon;