-- Restrict referral_rewards public SELECT to authenticated only (hides discount_code from anon)
DROP POLICY IF EXISTS "Public can view active rewards" ON public.referral_rewards;
CREATE POLICY "Authenticated can view active rewards"
ON public.referral_rewards
FOR SELECT
TO authenticated
USING (is_active = true);

-- Prevent rate-limit bypass: stop authenticated users from clearing/modifying order_create blocks
DROP POLICY IF EXISTS "Users can delete their own rate limit records" ON public.rate_limit_tracking;
DROP POLICY IF EXISTS "Users can update their own rate limit records" ON public.rate_limit_tracking;

CREATE POLICY "Users can delete their own non-order rate limit records"
ON public.rate_limit_tracking
FOR DELETE
TO authenticated
USING (
  identifier = (auth.uid())::text
  AND action_type NOT IN ('order_create', 'create_order')
);

CREATE POLICY "Users can update their own non-order rate limit records"
ON public.rate_limit_tracking
FOR UPDATE
TO authenticated
USING (
  identifier = (auth.uid())::text
  AND action_type NOT IN ('order_create', 'create_order')
)
WITH CHECK (
  identifier = (auth.uid())::text
  AND action_type NOT IN ('order_create', 'create_order')
);