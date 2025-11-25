-- Expand user_activity_logs table with audit fields
ALTER TABLE public.user_activity_logs 
ADD COLUMN IF NOT EXISTS before_data jsonb,
ADD COLUMN IF NOT EXISTS after_data jsonb,
ADD COLUMN IF NOT EXISTS resource_type text,
ADD COLUMN IF NOT EXISTS resource_id uuid,
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
ADD COLUMN IF NOT EXISTS session_id text;

-- Add comment for documentation
COMMENT ON TABLE public.user_activity_logs IS 'Comprehensive audit log for all sensitive user actions with immutable records for compliance';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id_created_at ON public.user_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_severity ON public.user_activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource ON public.user_activity_logs(resource_type, resource_id);

-- Create function to prevent modification of audit logs (immutability)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent updates to audit logs
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit logs cannot be modified for compliance reasons';
  END IF;
  
  -- Prevent deletion of audit logs
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit logs cannot be deleted for compliance reasons';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply immutability trigger
DROP TRIGGER IF EXISTS prevent_audit_log_changes ON public.user_activity_logs;
CREATE TRIGGER prevent_audit_log_changes
  BEFORE UPDATE OR DELETE ON public.user_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- Create audit retention cleanup function (for compliance periods)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(retention_days integer DEFAULT 1825)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Default retention: 5 years (1825 days)
  -- This should only be called by scheduled jobs
  DELETE FROM public.user_activity_logs
  WHERE created_at < now() - (retention_days || ' days')::interval;
END;
$$;

-- Update RLS policy to prevent users from deleting/updating their logs
DROP POLICY IF EXISTS "Users can delete their own activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Users can update their own activity logs" ON public.user_activity_logs;

-- Ensure only service role can delete (for retention cleanup)
CREATE POLICY "Only service role can manage audit logs"
ON public.user_activity_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);