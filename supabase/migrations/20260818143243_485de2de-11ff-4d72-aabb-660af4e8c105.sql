CREATE OR REPLACE FUNCTION public.prevent_customer_order_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Privileged contexts (service role / edge functions / staff) bypass
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role)
     OR public.has_role(auth.uid(), 'operador'::app_role)
     OR public.has_role(auth.uid(), 'moderator'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Ownership guard (defense in depth alongside RLS)
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR OLD.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado: Alteração de dados financeiros não permitida.';
  END IF;

  -- Strictly blocked financial / system fields
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.shipping_cost IS DISTINCT FROM OLD.shipping_cost
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.change_amount IS DISTINCT FROM OLD.change_amount
     OR NEW.referred_by_code IS DISTINCT FROM OLD.referred_by_code
     OR NEW.referral_points_awarded IS DISTINCT FROM OLD.referral_points_awarded
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'Acesso negado: Alteração de dados financeiros não permitida.';
  END IF;

  -- Status: customers may only cancel a strictly pending order
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status <> 'cancelled' OR OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Acesso negado: Alteração de status não permitida.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_customer_order_tampering_trg ON public.orders;
CREATE TRIGGER prevent_customer_order_tampering_trg
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_customer_order_tampering();

-- RLS: customers update only their own orders
DROP POLICY IF EXISTS "Customers can update own unpaid orders" ON public.orders;
CREATE POLICY "Customers can update own unpaid orders"
ON public.orders FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status IN ('pending', 'pending_payment'))
WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'pending_payment', 'cancelled'));

-- RLS: full admin control for admin and super_admin
DROP POLICY IF EXISTS "Admins can update order status" ON public.orders;
CREATE POLICY "Admins can update order status"
ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));