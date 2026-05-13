DROP FUNCTION IF EXISTS public.validate_discount_code(text);

CREATE OR REPLACE FUNCTION public.validate_discount_code(code_input text)
RETURNS TABLE(
  id uuid,
  code text,
  type text,
  value numeric,
  valid_until timestamp with time zone,
  schedule_type text,
  start_time time without time zone,
  end_time time without time zone,
  day_of_week integer,
  max_uses integer,
  is_active boolean,
  user_id uuid,
  is_referral_reward boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    id, code, type, value, valid_until, schedule_type,
    start_time, end_time, day_of_week, max_uses, is_active,
    user_id, is_referral_reward
  FROM discounts
  WHERE code = code_input
    AND is_active = true;
$function$;

GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO authenticated;