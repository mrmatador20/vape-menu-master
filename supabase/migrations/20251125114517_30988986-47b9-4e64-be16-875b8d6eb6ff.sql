-- Create rate limiting tracking table
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- Can be user_id, IP address, or device fingerprint
  action_type TEXT NOT NULL, -- Type of action: 'login', 'mfa_verify', 'api_call', 'order_create', etc.
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_rate_limit_identifier_action ON public.rate_limit_tracking(identifier, action_type);
CREATE INDEX idx_rate_limit_window_start ON public.rate_limit_tracking(window_start);
CREATE INDEX idx_rate_limit_blocked ON public.rate_limit_tracking(is_blocked, block_expires_at) WHERE is_blocked = true;

-- Enable RLS
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limit tracking (no user access)
CREATE POLICY "Service role full access on rate_limit_tracking"
  ON public.rate_limit_tracking
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean up old rate limit records (called by cron or periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete records older than 24 hours
  DELETE FROM public.rate_limit_tracking
  WHERE window_start < now() - INTERVAL '24 hours';
  
  -- Reset expired blocks
  UPDATE public.rate_limit_tracking
  SET is_blocked = false, block_expires_at = NULL
  WHERE is_blocked = true 
    AND block_expires_at IS NOT NULL 
    AND block_expires_at < now();
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_rate_limit_tracking_updated_at
  BEFORE UPDATE ON public.rate_limit_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.rate_limit_tracking IS 'Tracks API rate limits and blocks to prevent DDoS and brute force attacks';
COMMENT ON COLUMN public.rate_limit_tracking.identifier IS 'User ID, IP address, or device fingerprint for tracking';
COMMENT ON COLUMN public.rate_limit_tracking.action_type IS 'Type of action being rate limited (login, mfa_verify, api_call, etc.)';
COMMENT ON COLUMN public.rate_limit_tracking.attempt_count IS 'Number of attempts within the current time window';
COMMENT ON COLUMN public.rate_limit_tracking.window_start IS 'Start time of the current rate limit window';
COMMENT ON COLUMN public.rate_limit_tracking.is_blocked IS 'Whether the identifier is currently blocked';
COMMENT ON COLUMN public.rate_limit_tracking.block_expires_at IS 'When the block expires (NULL if not blocked or permanent)';