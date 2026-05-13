
-- 1. Restrict settings reads for authenticated users to non-sensitive keys
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.settings;

CREATE POLICY "Authenticated users can read public settings"
ON public.settings
FOR SELECT
TO authenticated
USING (
  key LIKE 'site_%'
  OR key LIKE 'theme_%'
  OR key LIKE 'public_%'
  OR key IN ('referral_points_per_order')
);

CREATE POLICY "Admins can read all settings"
ON public.settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 2. Lock down security_notification_logs inserts to service_role only
DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.security_notification_logs;

CREATE POLICY "Service role can insert notification logs"
ON public.security_notification_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Restrict anonymous rate-limit access: remove DELETE/UPDATE, keep SELECT/INSERT
DROP POLICY IF EXISTS "Anonymous users can manage anonymous rate limit records" ON public.rate_limit_tracking;

CREATE POLICY "Anonymous users can read anonymous rate limit records"
ON public.rate_limit_tracking
FOR SELECT
TO anon
USING (identifier = 'anonymous');

CREATE POLICY "Anonymous users can insert anonymous rate limit records"
ON public.rate_limit_tracking
FOR INSERT
TO anon
WITH CHECK (identifier = 'anonymous');
