-- CRITICAL FIX: Add RLS policies for rate_limit_tracking
-- Currently only service_role has access, causing frontend rate limiting to fail silently

-- Allow authenticated users to SELECT their own rate limit records
CREATE POLICY "Users can view their own rate limit records"
ON public.rate_limit_tracking
FOR SELECT
TO authenticated
USING (identifier = auth.uid()::text);

-- Allow authenticated users to INSERT their own rate limit records
CREATE POLICY "Users can insert their own rate limit records"
ON public.rate_limit_tracking
FOR INSERT
TO authenticated
WITH CHECK (identifier = auth.uid()::text);

-- Allow authenticated users to UPDATE their own rate limit records
CREATE POLICY "Users can update their own rate limit records"
ON public.rate_limit_tracking
FOR UPDATE
TO authenticated
USING (identifier = auth.uid()::text);

-- Allow authenticated users to DELETE their own rate limit records  
CREATE POLICY "Users can delete their own rate limit records"
ON public.rate_limit_tracking
FOR DELETE
TO authenticated
USING (identifier = auth.uid()::text);

-- Allow anonymous rate limiting (for pre-login operations like signup)
CREATE POLICY "Anonymous users can manage anonymous rate limit records"
ON public.rate_limit_tracking
FOR ALL
TO anon
USING (identifier = 'anonymous')
WITH CHECK (identifier = 'anonymous');

-- Allow admins to view all rate limit records for monitoring
CREATE POLICY "Admins can view all rate limit records"
ON public.rate_limit_tracking
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));