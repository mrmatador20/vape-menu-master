CREATE TABLE IF NOT EXISTS public.mfa_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  time_step bigint NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash, time_step)
);

GRANT SELECT ON public.mfa_code_usage TO authenticated;
GRANT ALL ON public.mfa_code_usage TO service_role;

ALTER TABLE public.mfa_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mfa code usage"
ON public.mfa_code_usage FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mfa_code_usage_used_at ON public.mfa_code_usage (used_at);

CREATE OR REPLACE FUNCTION public.claim_totp_code(p_code_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_step bigint := floor(extract(epoch from now()) / 30)::bigint;
  v_inserted integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_session');
  END IF;

  IF p_code_hash IS NULL OR length(p_code_hash) < 16 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_code');
  END IF;

  DELETE FROM public.mfa_code_usage WHERE used_at < now() - interval '10 minutes';

  INSERT INTO public.mfa_code_usage (user_id, code_hash, time_step)
  VALUES (v_user_id, p_code_hash, v_step)
  ON CONFLICT (user_id, code_hash, time_step) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'replay', 'time_step', v_step);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'time_step', v_step);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_totp_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_totp_code(text) TO authenticated;