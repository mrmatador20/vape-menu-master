CREATE OR REPLACE FUNCTION public.balcao_reverter_baixa(p_movement_id uuid, p_request_id uuid, p_notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.app_role;
  v_email text;
  v_existing uuid;
  v_orig record;
  v_new_id uuid;
  v_stock_before int;
  v_stock_after int;
  v_delta int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'request_id obrigatório'; END IF;

  SELECT id INTO v_existing FROM public.stock_movements WHERE request_id = p_request_id;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  v_role := public.get_user_primary_role(v_uid);
  IF v_role NOT IN ('super_admin','admin') THEN
    PERFORM public.log_security_event('balcao_unauthorized_reversao','critical',
      jsonb_build_object('movement_id',p_movement_id,'role',v_role));
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  PERFORM public.balcao_check_rate_limit('balcao:'||v_uid::text, 30, 1);
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT * INTO v_orig FROM public.stock_movements WHERE id = p_movement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada'; END IF;
  IF v_orig.reversed_by_movement_id IS NOT NULL THEN
    RAISE EXCEPTION 'Movimentação já foi revertida';
  END IF;
  IF v_orig.movement_type = 'reversao' THEN
    RAISE EXCEPTION 'Não é possível reverter uma reversão';
  END IF;

  v_delta := v_orig.stock_before - v_orig.stock_after;

  IF v_orig.flavor_id IS NOT NULL THEN
    SELECT stock INTO v_stock_before FROM public.flavors WHERE id = v_orig.flavor_id FOR UPDATE;
    v_stock_after := v_stock_before + v_delta;
    IF v_stock_after < 0 THEN RAISE EXCEPTION 'Reversão resultaria em estoque negativo'; END IF;
    UPDATE public.flavors SET stock = v_stock_after WHERE id = v_orig.flavor_id;
  ELSIF v_orig.product_id IS NOT NULL THEN
    SELECT stock INTO v_stock_before FROM public.products WHERE id = v_orig.product_id FOR UPDATE;
    v_stock_after := v_stock_before + v_delta;
    IF v_stock_after < 0 THEN RAISE EXCEPTION 'Reversão resultaria em estoque negativo'; END IF;
    UPDATE public.products SET stock = v_stock_after WHERE id = v_orig.product_id;
  ELSE
    RAISE EXCEPTION 'Produto da movimentação original não existe mais';
  END IF;

  INSERT INTO public.stock_movements(
    product_id, flavor_id, product_name_snapshot, product_sku_snapshot, category_snapshot,
    movement_type, reason, quantity, stock_before, stock_after,
    user_id, user_email_snapshot, user_role_snapshot, request_id, notes,
    reverses_movement_id
  ) VALUES (
    v_orig.product_id, v_orig.flavor_id, v_orig.product_name_snapshot, v_orig.product_sku_snapshot, v_orig.category_snapshot,
    'reversao', 'reversao', ABS(v_delta), v_stock_before, v_stock_after,
    v_uid, v_email, v_role, p_request_id,
    COALESCE(p_notes, 'Reversão de '||p_movement_id::text),
    p_movement_id
  ) RETURNING id INTO v_new_id;

  UPDATE public.stock_movements SET reversed_by_movement_id = v_new_id WHERE id = p_movement_id;

  RETURN v_new_id;
END $$;