
-- Finding 1: Tighten discounts public SELECT policy (defense in depth)
-- Backfill nullable flag and enforce NOT NULL so the public policy cannot leak rows with NULL flags
UPDATE public.discounts SET is_referral_reward = false WHERE is_referral_reward IS NULL;
ALTER TABLE public.discounts ALTER COLUMN is_referral_reward SET DEFAULT false;
ALTER TABLE public.discounts ALTER COLUMN is_referral_reward SET NOT NULL;

DROP POLICY IF EXISTS "Public can view active general discounts" ON public.discounts;
CREATE POLICY "Public can view active general discounts"
ON public.discounts
FOR SELECT
TO authenticated
USING (
  is_referral_reward = false
  AND is_influencer_coupon = false
  AND is_active = true
  AND (valid_until IS NULL OR valid_until >= now())
  AND user_id IS NULL
);

-- Finding 3: Allow anonymous read access to anonymized public_reviews view.
-- View is currently security_invoker=true, which blocks anon due to reviews RLS.
-- Switch to security definer-style (security_invoker=false) so the view's anonymized
-- columns can be read publicly, while the underlying reviews table stays protected.
ALTER VIEW public.public_reviews SET (security_invoker = false);
GRANT SELECT ON public.public_reviews TO anon, authenticated;
