CREATE OR REPLACE FUNCTION public.prevent_customer_order_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Privileged contexts (service role / edge functions / admins) bypass
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role)
     OR public.has_role(auth.uid(), 'operador'::app_role)
     OR public.has_role(auth.uid(), 'moderator'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.shipping_cost IS DISTINCT FROM OLD.shipping_cost
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.change_amount IS DISTINCT FROM OLD.change_amount
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.referred_by_code IS DISTINCT FROM OLD.referred_by_code
     OR NEW.referral_points_awarded IS DISTINCT FROM OLD.referral_points_awarded
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'Alteração não permitida: valores e dados financeiros do pedido só podem ser modificados pelo sistema';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_customer_order_tampering_trg ON public.orders;
CREATE TRIGGER prevent_customer_order_tampering_trg
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_customer_order_tampering();