ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS original_price numeric,
  ADD COLUMN IF NOT EXISTS discount_amount numeric,
  ADD COLUMN IF NOT EXISTS final_price numeric,
  ADD COLUMN IF NOT EXISTS payment_method text;

CREATE OR REPLACE FUNCTION public.balcao_unit_price(p_product_id uuid, p_flavor_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base numeric;
  v_dv numeric;
  v_dt text;
  v_store_active boolean;
  v_store_type text;
  v_store_value numeric;
  v_price numeric;
BEGIN
  SELECT COALESCE(f.price, p.price), p.discount_value, p.discount_type
    INTO v_base, v_dv, v_dt
    FROM public.products p
    LEFT JOIN public.flavors f ON f.id = p_flavor_id AND f.product_id = p.id
    WHERE p.id = p_product_id;

  IF v_base IS NULL THEN RETURN NULL; END IF;

  IF COALESCE(v_dv, 0) <= 0 THEN
    SELECT (value = 'true') INTO v_store_active FROM public.settings WHERE key = 'store_discount_active';
    IF COALESCE(v_store_active, false) THEN
      SELECT value INTO v_store_type FROM public.settings WHERE key = 'store_discount_type';
      SELECT value::numeric INTO v_store_value FROM public.settings WHERE key = 'store_discount_value';
      v_dv := COALESCE(v_store_value, 0);
      v_dt := COALESCE(v_store_type, 'percent');
    END IF;
  END IF;

  v_price := v_base;
  IF COALESCE(v_dv, 0) > 0 THEN
    IF COALESCE(v_dt, 'percent') = 'percent' THEN
      v_price := v_base * (1 - LEAST(v_dv, 100) / 100.0);
    ELSE
      v_price := v_base - v_dv;
    END IF;
  END IF;

  RETURN GREATEST(ROUND(v_price, 2), 0);
END $function$;

GRANT EXECUTE ON FUNCTION public.balcao_unit_price(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.balcao_baixa_estoque(p_product_id uuid, p_flavor_id uuid, p_quantity integer, p_movement_type stock_movement_type, p_reason stock_movement_reason, p_notes text, p_request_id uuid, p_manual_discount numeric DEFAULT 0, p_payment_method text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.app_role;
  v_email text;
  v_stock_before int;
  v_stock_after int;
  v_existing uuid;
  v_movement_id uuid;
  v_product record;
  v_flavor record;
  v_unit numeric;
  v_original numeric;
  v_discount numeric;
  v_final numeric;
  v_payment text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'request_id obrigatório'; END IF;

  SELECT id INTO v_existing FROM public.stock_movements WHERE request_id = p_request_id;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  v_role := public.get_user_primary_role(v_uid);
  IF v_role NOT IN ('super_admin','admin','operador') THEN
    PERFORM public.log_security_event('balcao_unauthorized_baixa','critical',
      jsonb_build_object('product_id',p_product_id,'role',v_role));
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_movement_type NOT IN ('baixa_manual','venda_loja_fisica') THEN
    RAISE EXCEPTION 'Tipo de movimento inválido para baixa';
  END IF;

  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('dinheiro','pix_balcao','credito_balcao','debito_balcao') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida';
  END IF;
  v_payment := p_payment_method;

  PERFORM public.balcao_check_rate_limit('balcao:'||v_uid::text, 30, 1);
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;

  v_unit := public.balcao_unit_price(p_product_id, p_flavor_id);
  v_original := ROUND(COALESCE(v_unit, 0) * p_quantity, 2);
  v_discount := LEAST(GREATEST(COALESCE(p_manual_discount, 0), 0), v_original);
  v_final := ROUND(v_original - v_discount, 2);

  IF p_flavor_id IS NOT NULL THEN
    SELECT f.*, p.name AS pname, p.category AS pcat, p.sku AS psku
      INTO v_flavor
      FROM public.flavors f JOIN public.products p ON p.id = f.product_id
      WHERE f.id = p_flavor_id AND f.product_id = p_product_id
      FOR UPDATE OF f;
    IF NOT FOUND THEN RAISE EXCEPTION 'Variação não encontrada'; END IF;
    v_stock_before := v_flavor.stock;
    IF v_stock_before < p_quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente (atual: %)', v_stock_before;
    END IF;
    v_stock_after := v_stock_before - p_quantity;
    UPDATE public.flavors SET stock = v_stock_after WHERE id = p_flavor_id;

    INSERT INTO public.stock_movements(
      product_id, flavor_id, product_name_snapshot, product_sku_snapshot, category_snapshot,
      movement_type, reason, quantity, stock_before, stock_after,
      user_id, user_email_snapshot, user_role_snapshot, request_id, notes,
      original_price, discount_amount, final_price, payment_method
    ) VALUES (
      p_product_id, p_flavor_id, v_flavor.pname || ' • ' || COALESCE(v_flavor.name,''), COALESCE(v_flavor.sku, v_flavor.psku), v_flavor.pcat,
      p_movement_type, p_reason, p_quantity, v_stock_before, v_stock_after,
      v_uid, v_email, v_role, p_request_id, p_notes,
      v_original, v_discount, v_final, v_payment
    ) RETURNING id INTO v_movement_id;
  ELSE
    SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
    v_stock_before := v_product.stock;
    IF v_stock_before < p_quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente (atual: %)', v_stock_before;
    END IF;
    v_stock_after := v_stock_before - p_quantity;
    UPDATE public.products SET stock = v_stock_after WHERE id = p_product_id;

    INSERT INTO public.stock_movements(
      product_id, product_name_snapshot, product_sku_snapshot, category_snapshot,
      movement_type, reason, quantity, stock_before, stock_after,
      user_id, user_email_snapshot, user_role_snapshot, request_id, notes,
      original_price, discount_amount, final_price, payment_method
    ) VALUES (
      p_product_id, v_product.name, v_product.sku, v_product.category,
      p_movement_type, p_reason, p_quantity, v_stock_before, v_stock_after,
      v_uid, v_email, v_role, p_request_id, p_notes,
      v_original, v_discount, v_final, v_payment
    ) RETURNING id INTO v_movement_id;
  END IF;

  RETURN v_movement_id;
END $function$;