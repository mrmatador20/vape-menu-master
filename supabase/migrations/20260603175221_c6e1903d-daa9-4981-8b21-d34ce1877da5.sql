
-- Undo column REVOKEs (admins are in the authenticated role and need these)
GRANT SELECT (code) ON public.discounts TO authenticated;
GRANT SELECT (discount_code) ON public.referral_rewards TO authenticated;

-- Remove the broad SELECT policies (admins still read via their admin ALL policy)
DROP POLICY IF EXISTS "Public can view active general discounts (no code)" ON public.discounts;
DROP POLICY IF EXISTS "Authenticated can view active rewards" ON public.referral_rewards;

-- Drop the view (it returned no rows under security_invoker because non-admins
-- have no SELECT on discounts). Replace with SECURITY DEFINER functions that
-- only expose safe columns.
DROP VIEW IF EXISTS public.public_active_discounts;

CREATE OR REPLACE FUNCTION public.get_active_general_discounts()
RETURNS TABLE (
  id uuid,
  value numeric,
  type text,
  schedule_type text,
  start_time time without time zone,
  end_time time without time zone,
  day_of_week integer,
  is_active boolean,
  valid_until timestamp with time zone,
  scope_type text,
  scope_category text,
  scope_subcategory text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, value, type, schedule_type,
    start_time, end_time, day_of_week,
    is_active, valid_until,
    scope_type, scope_category, scope_subcategory
  FROM public.discounts
  WHERE is_referral_reward = false
    AND is_influencer_coupon = false
    AND is_active = true
    AND (valid_until IS NULL OR valid_until >= now())
    AND user_id IS NULL;
$$;

REVOKE ALL ON FUNCTION public.get_active_general_discounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_general_discounts() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_active_referral_rewards()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  points_required integer,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, description, points_required, is_active, created_at, updated_at
  FROM public.referral_rewards
  WHERE is_active = true
  ORDER BY points_required ASC;
$$;

REVOKE ALL ON FUNCTION public.get_active_referral_rewards() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_referral_rewards() TO authenticated;
