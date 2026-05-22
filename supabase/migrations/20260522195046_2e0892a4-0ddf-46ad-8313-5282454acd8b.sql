
-- 1. review_responses: hide admin_user_id from public
DROP POLICY IF EXISTS "Respostas são públicas para leitura" ON public.review_responses;

CREATE POLICY "Admins can view review responses"
ON public.review_responses
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.public_review_responses
WITH (security_invoker=on) AS
SELECT id, review_id, response_text, created_at, updated_at
FROM public.review_responses;

GRANT SELECT ON public.public_review_responses TO anon, authenticated;

-- 2. discounts: exclude influencer coupons from public listing
DROP POLICY IF EXISTS "Public can view active general discounts" ON public.discounts;

CREATE POLICY "Public can view active general discounts"
ON public.discounts
FOR SELECT
TO authenticated
USING (
  ((is_referral_reward = false) OR (is_referral_reward IS NULL))
  AND (is_influencer_coupon = false OR is_influencer_coupon IS NULL)
  AND is_active = true
  AND ((valid_until IS NULL) OR (valid_until >= now()))
);

CREATE POLICY "Influencers can view their own coupons"
ON public.discounts
FOR SELECT
TO authenticated
USING (
  is_influencer_coupon = true
  AND influencer_user_id = auth.uid()
);
