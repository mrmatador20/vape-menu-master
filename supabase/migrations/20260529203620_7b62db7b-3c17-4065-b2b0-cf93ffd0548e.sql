ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS scope_type text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS scope_category text,
  ADD COLUMN IF NOT EXISTS scope_subcategory text;

ALTER TABLE public.discounts
  DROP CONSTRAINT IF EXISTS discounts_scope_type_check;

ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_scope_type_check
  CHECK (scope_type IN ('all', 'category', 'subcategory'));

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
  is_referral_reward boolean,
  is_influencer_coupon boolean,
  influencer_user_id uuid,
  scope_type text,
  scope_category text,
  scope_subcategory text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    id, code, type, value, valid_until, schedule_type,
    start_time, end_time, day_of_week, max_uses, is_active,
    user_id, is_referral_reward,
    is_influencer_coupon, influencer_user_id,
    scope_type, scope_category, scope_subcategory
  FROM discounts
  WHERE LOWER(code) = LOWER(TRIM(code_input))
    AND is_active = true
  LIMIT 1;
$function$;