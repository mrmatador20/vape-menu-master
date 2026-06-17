
-- 1. Lock down orders/order_items inserts to service role only (create-order edge function)
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create items for their own orders" ON public.order_items;

-- 2. Lock down rate_limit_tracking writes to service role / RPC only
DROP POLICY IF EXISTS "Users can delete their own non-order rate limit records" ON public.rate_limit_tracking;
DROP POLICY IF EXISTS "Users can update their own non-order rate limit records" ON public.rate_limit_tracking;
DROP POLICY IF EXISTS "Users can insert their own rate limit records" ON public.rate_limit_tracking;
DROP POLICY IF EXISTS "Anonymous users can insert anonymous rate limit records" ON public.rate_limit_tracking;

-- Dedup to allow unique constraint
DELETE FROM public.rate_limit_tracking a
USING public.rate_limit_tracking b
WHERE a.identifier = b.identifier
  AND a.action_type = b.action_type
  AND a.ctid < b.ctid;

ALTER TABLE public.rate_limit_tracking
  ADD CONSTRAINT rate_limit_tracking_identifier_action_key UNIQUE (identifier, action_type);

-- 3. Server-side RPCs for client-driven rate limiting (only writes via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.client_check_rate_limit(
  p_action text,
  p_max_attempts int,
  p_window_minutes int,
  p_block_minutes int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_identifier text;
  v_rec public.rate_limit_tracking%ROWTYPE;
  v_now timestamptz := now();
  v_block_until timestamptz;
  v_remaining int;
BEGIN
  v_identifier := COALESCE(v_uid::text, 'anonymous');

  SELECT * INTO v_rec
    FROM public.rate_limit_tracking
    WHERE identifier = v_identifier AND action_type = p_action
    FOR UPDATE;

  -- Currently blocked?
  IF v_rec.id IS NOT NULL AND v_rec.is_blocked AND v_rec.block_expires_at IS NOT NULL AND v_rec.block_expires_at > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'block_expires_at', v_rec.block_expires_at,
      'message', 'Você atingiu o limite de tentativas. Tente novamente em ' ||
        CEIL(EXTRACT(EPOCH FROM (v_rec.block_expires_at - v_now))/60)::int || ' minuto(s).'
    );
  END IF;

  -- Reset expired block
  IF v_rec.id IS NOT NULL AND v_rec.is_blocked AND (v_rec.block_expires_at IS NULL OR v_rec.block_expires_at <= v_now) THEN
    UPDATE public.rate_limit_tracking
      SET is_blocked = false, block_expires_at = NULL,
          attempt_count = 1, window_start = v_now, updated_at = v_now
      WHERE id = v_rec.id;
    RETURN jsonb_build_object('allowed', true, 'remaining_attempts', p_max_attempts - 1);
  END IF;

  -- No record yet
  IF v_rec.id IS NULL THEN
    INSERT INTO public.rate_limit_tracking(identifier, action_type, attempt_count, window_start)
    VALUES (v_identifier, p_action, 1, v_now)
    ON CONFLICT (identifier, action_type) DO UPDATE
      SET attempt_count = 1, window_start = v_now, is_blocked = false, block_expires_at = NULL, updated_at = v_now;
    RETURN jsonb_build_object('allowed', true, 'remaining_attempts', p_max_attempts - 1);
  END IF;

  -- Window expired -> reset
  IF v_rec.window_start IS NULL OR (v_now - v_rec.window_start) > (p_window_minutes || ' minutes')::interval THEN
    UPDATE public.rate_limit_tracking
      SET attempt_count = 1, window_start = v_now, updated_at = v_now
      WHERE id = v_rec.id;
    RETURN jsonb_build_object('allowed', true, 'remaining_attempts', p_max_attempts - 1);
  END IF;

  -- Within window: check / increment
  IF v_rec.attempt_count >= p_max_attempts THEN
    v_block_until := v_now + (p_block_minutes || ' minutes')::interval;
    UPDATE public.rate_limit_tracking
      SET is_blocked = true, block_expires_at = v_block_until, updated_at = v_now
      WHERE id = v_rec.id;
    RETURN jsonb_build_object(
      'allowed', false,
      'block_expires_at', v_block_until,
      'message', 'Você atingiu o limite de ' || p_max_attempts || ' tentativas. Bloqueado por ' || p_block_minutes || ' minutos.'
    );
  END IF;

  UPDATE public.rate_limit_tracking
    SET attempt_count = attempt_count + 1, updated_at = v_now
    WHERE id = v_rec.id;
  v_remaining := p_max_attempts - v_rec.attempt_count - 1;
  RETURN jsonb_build_object('allowed', true, 'remaining_attempts', GREATEST(v_remaining, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.client_reset_rate_limit(p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier text := COALESCE(auth.uid()::text, 'anonymous');
BEGIN
  DELETE FROM public.rate_limit_tracking
    WHERE identifier = v_identifier AND action_type = p_action;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_check_rate_limit(text,int,int,int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.client_reset_rate_limit(text) TO authenticated, anon;
