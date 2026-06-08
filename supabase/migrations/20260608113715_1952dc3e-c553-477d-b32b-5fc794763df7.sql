DROP FUNCTION IF EXISTS public.validate_discount_code(text);

CREATE OR REPLACE FUNCTION public.validate_discount_code(code_input text)
RETURNS TABLE(
  id uuid, code text, type text, value numeric,
  valid_until timestamp with time zone, schedule_type text,
  start_time time without time zone, end_time time without time zone,
  day_of_week integer, max_uses integer, is_active boolean,
  is_referral_reward boolean, is_influencer_coupon boolean,
  is_own_referral_reward boolean, is_own_influencer_coupon boolean,
  scope_type text, scope_category text, scope_subcategory text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    id, code, type, value, valid_until, schedule_type,
    start_time, end_time, day_of_week, max_uses, is_active,
    is_referral_reward, is_influencer_coupon,
    (is_referral_reward AND user_id IS NOT NULL AND user_id = auth.uid()) AS is_own_referral_reward,
    (is_influencer_coupon AND influencer_user_id IS NOT NULL AND influencer_user_id = auth.uid()) AS is_own_influencer_coupon,
    scope_type, scope_category, scope_subcategory
  FROM discounts
  WHERE LOWER(code) = LOWER(TRIM(code_input))
    AND is_active = true
  LIMIT 1;
$function$;

REVOKE EXECUTE ON FUNCTION public.validate_discount_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_discount_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO authenticated, service_role;