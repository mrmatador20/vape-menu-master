
-- =====================================================
-- Enums for movement
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.stock_movement_type AS ENUM (
    'baixa_manual','reversao','entrada','ajuste_manual','venda_online','venda_loja_fisica'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stock_movement_reason AS ENUM (
    'venda_loja','produto_danificado','troca','ajuste_estoque','outro','venda_site','reversao','entrada_fornecedor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- stock_movements
-- =====================================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  flavor_id  uuid REFERENCES public.flavors(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  product_sku_snapshot text,
  category_snapshot text,
  movement_type public.stock_movement_type NOT NULL,
  reason public.stock_movement_reason,
  quantity integer NOT NULL CHECK (quantity > 0),
  stock_before integer NOT NULL,
  stock_after integer NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email_snapshot text,
  user_role_snapshot public.app_role,
  request_id uuid NOT NULL UNIQUE,
  reversed_by_movement_id uuid REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  reverses_movement_id uuid REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  notes text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_user_idx ON public.stock_movements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_type_idx ON public.stock_movements(movement_type, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_created_idx ON public.stock_movements(created_at DESC);

GRANT SELECT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_select_admin" ON public.stock_movements
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "stock_movements_select_own" ON public.stock_movements
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_role(auth.uid(), 'operador'::public.app_role)
);

CREATE OR REPLACE FUNCTION public.prevent_stock_movement_modification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.reversed_by_movement_id IS NOT NULL AND NEW.reversed_by_movement_id IS DISTINCT FROM OLD.reversed_by_movement_id)
       OR OLD.id <> NEW.id
       OR OLD.product_id IS DISTINCT FROM NEW.product_id
       OR OLD.movement_type <> NEW.movement_type
       OR OLD.quantity <> NEW.quantity
       OR OLD.stock_before <> NEW.stock_before
       OR OLD.stock_after <> NEW.stock_after
       OR OLD.user_id IS DISTINCT FROM NEW.user_id
       OR OLD.request_id <> NEW.request_id
       OR OLD.created_at <> NEW.created_at THEN
      RAISE EXCEPTION 'Movimentações de estoque são imutáveis';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Movimentações de estoque não podem ser excluídas';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_stock_movement_mod ON public.stock_movements;
CREATE TRIGGER trg_prevent_stock_movement_mod
BEFORE UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.prevent_stock_movement_modification();

-- =====================================================
-- security_events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_created_idx ON public.security_events(created_at DESC);

GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_events_select_super_admin" ON public.security_events
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.prevent_security_event_modification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    RAISE EXCEPTION 'Eventos de segurança são imutáveis';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_security_event_mod ON public.security_events;
CREATE TRIGGER trg_prevent_security_event_mod
BEFORE UPDATE OR DELETE ON public.security_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_security_event_modification();

-- =====================================================
-- Helpers
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text DEFAULT 'warning',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.security_events(user_id, event_type, severity, metadata)
  VALUES (auth.uid(), p_event_type, p_severity, COALESCE(p_metadata,'{}'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.log_security_event(text,text,jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_user_primary_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles
   WHERE user_id = _user_id
   ORDER BY CASE role
     WHEN 'super_admin' THEN 1
     WHEN 'admin' THEN 2
     WHEN 'moderator' THEN 3
     WHEN 'operador' THEN 4
     WHEN 'user' THEN 5
   END
   LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_user_primary_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_primary_role(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.balcao_check_rate_limit(p_key text, p_max int, p_window_minutes int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COALESCE(SUM(attempt_count),0) INTO v_count
  FROM public.rate_limit_tracking
  WHERE identifier = p_key
    AND window_start > now() - (p_window_minutes || ' minutes')::interval;

  IF v_count >= p_max THEN
    PERFORM public.log_security_event(
      'rate_limit_exceeded','warning',
      jsonb_build_object('key',p_key,'count',v_count,'limit',p_max)
    );
    RAISE EXCEPTION 'Limite de operações excedido. Tente novamente em instantes.';
  END IF;

  INSERT INTO public.rate_limit_tracking(identifier, action_type, attempt_count, window_start)
  VALUES (p_key, 'balcao', 1, now());
END $$;
REVOKE ALL ON FUNCTION public.balcao_check_rate_limit(text,int,int) FROM PUBLIC;

-- =====================================================
-- balcao_baixa_estoque
-- =====================================================
CREATE OR REPLACE FUNCTION public.balcao_baixa_estoque(
  p_product_id uuid,
  p_flavor_id  uuid,
  p_quantity   integer,
  p_movement_type public.stock_movement_type,
  p_reason public.stock_movement_reason,
  p_notes text,
  p_request_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  PERFORM public.balcao_check_rate_limit('balcao:'||v_uid::text, 30, 1);
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;

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
      user_id, user_email_snapshot, user_role_snapshot, request_id, notes
    ) VALUES (
      p_product_id, p_flavor_id, v_flavor.pname || ' • ' || COALESCE(v_flavor.name,''), COALESCE(v_flavor.sku, v_flavor.psku), v_flavor.pcat,
      p_movement_type, p_reason, p_quantity, v_stock_before, v_stock_after,
      v_uid, v_email, v_role, p_request_id, p_notes
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
      user_id, user_email_snapshot, user_role_snapshot, request_id, notes
    ) VALUES (
      p_product_id, v_product.name, v_product.sku, v_product.category,
      p_movement_type, p_reason, p_quantity, v_stock_before, v_stock_after,
      v_uid, v_email, v_role, p_request_id, p_notes
    ) RETURNING id INTO v_movement_id;
  END IF;

  RETURN v_movement_id;
END $$;
REVOKE ALL ON FUNCTION public.balcao_baixa_estoque(uuid,uuid,integer,public.stock_movement_type,public.stock_movement_reason,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.balcao_baixa_estoque(uuid,uuid,integer,public.stock_movement_type,public.stock_movement_reason,text,uuid) TO authenticated;

-- =====================================================
-- balcao_entrada_estoque
-- =====================================================
CREATE OR REPLACE FUNCTION public.balcao_entrada_estoque(
  p_product_id uuid,
  p_flavor_id  uuid,
  p_quantity   integer,
  p_notes text,
  p_request_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'request_id obrigatório'; END IF;

  SELECT id INTO v_existing FROM public.stock_movements WHERE request_id = p_request_id;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  v_role := public.get_user_primary_role(v_uid);
  IF v_role NOT IN ('super_admin','admin') THEN
    PERFORM public.log_security_event('balcao_unauthorized_entrada','critical',
      jsonb_build_object('product_id',p_product_id,'role',v_role));
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  PERFORM public.balcao_check_rate_limit('balcao:'||v_uid::text, 30, 1);
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;

  IF p_flavor_id IS NOT NULL THEN
    SELECT f.*, p.name AS pname, p.category AS pcat, p.sku AS psku
      INTO v_flavor FROM public.flavors f JOIN public.products p ON p.id = f.product_id
      WHERE f.id = p_flavor_id AND f.product_id = p_product_id FOR UPDATE OF f;
    IF NOT FOUND THEN RAISE EXCEPTION 'Variação não encontrada'; END IF;
    v_stock_before := v_flavor.stock;
    v_stock_after := v_stock_before + p_quantity;
    UPDATE public.flavors SET stock = v_stock_after WHERE id = p_flavor_id;

    INSERT INTO public.stock_movements(
      product_id, flavor_id, product_name_snapshot, product_sku_snapshot, category_snapshot,
      movement_type, reason, quantity, stock_before, stock_after,
      user_id, user_email_snapshot, user_role_snapshot, request_id, notes
    ) VALUES (
      p_product_id, p_flavor_id, v_flavor.pname || ' • ' || COALESCE(v_flavor.name,''), COALESCE(v_flavor.sku, v_flavor.psku), v_flavor.pcat,
      'entrada', 'entrada_fornecedor', p_quantity, v_stock_before, v_stock_after,
      v_uid, v_email, v_role, p_request_id, p_notes
    ) RETURNING id INTO v_movement_id;
  ELSE
    SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
    v_stock_before := v_product.stock;
    v_stock_after := v_stock_before + p_quantity;
    UPDATE public.products SET stock = v_stock_after WHERE id = p_product_id;

    INSERT INTO public.stock_movements(
      product_id, product_name_snapshot, product_sku_snapshot, category_snapshot,
      movement_type, reason, quantity, stock_before, stock_after,
      user_id, user_email_snapshot, user_role_snapshot, request_id, notes
    ) VALUES (
      p_product_id, v_product.name, v_product.sku, v_product.category,
      'entrada', 'entrada_fornecedor', p_quantity, v_stock_before, v_stock_after,
      v_uid, v_email, v_role, p_request_id, p_notes
    ) RETURNING id INTO v_movement_id;
  END IF;

  RETURN v_movement_id;
END $$;
REVOKE ALL ON FUNCTION public.balcao_entrada_estoque(uuid,uuid,integer,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.balcao_entrada_estoque(uuid,uuid,integer,text,uuid) TO authenticated;

-- =====================================================
-- balcao_ajuste_estoque
-- =====================================================
CREATE OR REPLACE FUNCTION public.balcao_ajuste_estoque(
  p_product_id uuid,
  p_flavor_id uuid,
  p_new_stock integer,
  p_notes text,
  p_request_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.app_role;
  v_email text;
  v_stock_before int;
  v_diff int;
  v_existing uuid;
  v_movement_id uuid;
  v_product record;
  v_flavor record;
  v_qty int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_new_stock IS NULL OR p_new_stock < 0 THEN RAISE EXCEPTION 'Estoque inválido'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'request_id obrigatório'; END IF;

  SELECT id INTO v_existing FROM public.stock_movements WHERE request_id = p_request_id;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  v_role := public.get_user_primary_role(v_uid);
  IF v_role <> 'super_admin' THEN
    PERFORM public.log_security_event('balcao_unauthorized_ajuste','critical',
      jsonb_build_object('product_id',p_product_id,'role',v_role));
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  PERFORM public.balcao_check_rate_limit('balcao:'||v_uid::text, 30, 1);
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;

  IF p_flavor_id IS NOT NULL THEN
    SELECT f.*, p.name AS pname, p.category AS pcat, p.sku AS psku
      INTO v_flavor FROM public.flavors f JOIN public.products p ON p.id = f.product_id
      WHERE f.id = p_flavor_id AND f.product_id = p_product_id FOR UPDATE OF f;
    IF NOT FOUND THEN RAISE EXCEPTION 'Variação não encontrada'; END IF;
    v_stock_before := v_flavor.stock;
    v_diff := p_new_stock - v_stock_before;
    v_qty := ABS(v_diff);
    IF v_qty = 0 THEN RAISE EXCEPTION 'Nenhuma alteração de estoque'; END IF;
    UPDATE public.flavors SET stock = p_new_stock WHERE id = p_flavor_id;

    INSERT INTO public.stock_movements(
      product_id, flavor_id, product_name_snapshot, product_sku_snapshot, category_snapshot,
      movement_type, reason, quantity, stock_before, stock_after,
      user_id, user_email_snapshot, user_role_snapshot, request_id, notes
    ) VALUES (
      p_product_id, p_flavor_id, v_flavor.pname || ' • ' || COALESCE(v_flavor.name,''), COALESCE(v_flavor.sku, v_flavor.psku), v_flavor.pcat,
      'ajuste_manual', 'ajuste_estoque', v_qty, v_stock_before, p_new_stock,
      v_uid, v_email, v_role, p_request_id, p_notes
    ) RETURNING id INTO v_movement_id;
  ELSE
    SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
    v_stock_before := v_product.stock;
    v_diff := p_new_stock - v_stock_before;
    v_qty := ABS(v_diff);
    IF v_qty = 0 THEN RAISE EXCEPTION 'Nenhuma alteração de estoque'; END IF;
    UPDATE public.products SET stock = p_new_stock WHERE id = p_product_id;

    INSERT INTO public.stock_movements(
      product_id, product_name_snapshot, product_sku_snapshot, category_snapshot,
      movement_type, reason, quantity, stock_before, stock_after,
      user_id, user_email_snapshot, user_role_snapshot, request_id, notes
    ) VALUES (
      p_product_id, v_product.name, v_product.sku, v_product.category,
      'ajuste_manual', 'ajuste_estoque', v_qty, v_stock_before, p_new_stock,
      v_uid, v_email, v_role, p_request_id, p_notes
    ) RETURNING id INTO v_movement_id;
  END IF;

  RETURN v_movement_id;
END $$;
REVOKE ALL ON FUNCTION public.balcao_ajuste_estoque(uuid,uuid,integer,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.balcao_ajuste_estoque(uuid,uuid,integer,text,uuid) TO authenticated;

-- =====================================================
-- balcao_reverter_baixa
-- =====================================================
CREATE OR REPLACE FUNCTION public.balcao_reverter_baixa(
  p_movement_id uuid,
  p_request_id uuid,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  IF v_role <> 'super_admin' THEN
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
REVOKE ALL ON FUNCTION public.balcao_reverter_baixa(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.balcao_reverter_baixa(uuid,uuid,text) TO authenticated;

-- =====================================================
-- Trigger: log online sales automatically
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_online_sale_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item record;
  v_product record;
  v_stock_after int;
BEGIN
  IF NEW.status IN ('confirmed','delivered')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('confirmed','delivered')) THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity, oi.flavor
      FROM public.order_items oi WHERE oi.order_id = NEW.id
    LOOP
      SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id;
      IF v_product.id IS NULL THEN CONTINUE; END IF;
      v_stock_after := v_product.stock;
      BEGIN
        INSERT INTO public.stock_movements(
          product_id, product_name_snapshot, product_sku_snapshot, category_snapshot,
          movement_type, reason, quantity, stock_before, stock_after,
          user_id, user_email_snapshot, user_role_snapshot, request_id, notes, order_id
        ) VALUES (
          v_product.id, v_product.name, v_product.sku, v_product.category,
          'venda_online', 'venda_site', v_item.quantity, v_stock_after + v_item.quantity, v_stock_after,
          NEW.user_id, NULL, NULL, gen_random_uuid(),
          'Pedido #'||substring(NEW.id::text from 1 for 8), NEW.id
        );
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[log_online_sale_movement] %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_online_sale ON public.orders;
CREATE TRIGGER trg_log_online_sale
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_online_sale_movement();
