-- product_views: constrain INSERT to prevent spoofing user_id
DROP POLICY IF EXISTS "Anyone can record a product view" ON public.product_views;

CREATE POLICY "Anonymous can insert anonymous product views"
ON public.product_views
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated users insert own product views"
ON public.product_views
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- email_verification_codes: restrict all writes to service_role only
CREATE POLICY "Service role manages verification codes"
ON public.email_verification_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);