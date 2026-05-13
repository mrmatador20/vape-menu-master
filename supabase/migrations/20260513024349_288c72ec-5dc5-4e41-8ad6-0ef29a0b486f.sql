
-- 1. Lock down referral_points: only service_role can insert/update
DROP POLICY IF EXISTS "Service role can insert points" ON public.referral_points;
DROP POLICY IF EXISTS "Service role can update points" ON public.referral_points;

CREATE POLICY "Service role can insert points"
ON public.referral_points
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update points"
ON public.referral_points
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Lock down referral_transactions inserts to service_role only
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.referral_transactions;

CREATE POLICY "Service role can insert transactions"
ON public.referral_transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Recreate public_reviews with security_invoker
DROP VIEW IF EXISTS public.public_reviews;
CREATE VIEW public.public_reviews
WITH (security_invoker = true) AS
SELECT
  id,
  product_id,
  rating,
  comment,
  image_url,
  created_at,
  substring(user_id::text, 1, 8) || '...'::text AS anonymous_user
FROM public.reviews;

GRANT SELECT ON public.public_reviews TO anon, authenticated;

-- 4. Remove user_activity_logs from realtime publication to stop broadcasting sensitive logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_activity_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.user_activity_logs';
  END IF;
END $$;
