CREATE OR REPLACE FUNCTION public.balcao_check_rate_limit(p_key text, p_max integer, p_window_minutes integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_window interval := (p_window_minutes || ' minutes')::interval;
BEGIN
  SELECT COALESCE(attempt_count,0) INTO v_count
  FROM public.rate_limit_tracking
  WHERE identifier = p_key
    AND action_type = 'balcao'
    AND window_start > now() - v_window;

  IF COALESCE(v_count,0) >= p_max THEN
    PERFORM public.log_security_event(
      'rate_limit_exceeded','warning',
      jsonb_build_object('key',p_key,'count',v_count,'limit',p_max)
    );
    RAISE EXCEPTION 'Limite de operações excedido. Tente novamente em instantes.';
  END IF;

  INSERT INTO public.rate_limit_tracking(identifier, action_type, attempt_count, window_start)
  VALUES (p_key, 'balcao', 1, now())
  ON CONFLICT (identifier, action_type) DO UPDATE
  SET attempt_count = CASE
        WHEN public.rate_limit_tracking.window_start > now() - v_window
          THEN public.rate_limit_tracking.attempt_count + 1
        ELSE 1
      END,
      window_start = CASE
        WHEN public.rate_limit_tracking.window_start > now() - v_window
          THEN public.rate_limit_tracking.window_start
        ELSE now()
      END,
      updated_at = now();
END $$;