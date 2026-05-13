-- Remove client-side INSERT on user_activity_logs; only service_role should write logs
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.user_activity_logs;

-- Add admin SELECT policy for discount_usage
CREATE POLICY "Admins can view all discount usage"
ON public.discount_usage
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));