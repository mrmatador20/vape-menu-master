-- 1) Auditoria: quem executou a ação
ALTER TABLE public.order_logs ADD COLUMN IF NOT EXISTS performed_by uuid;

-- 2) RLS: clientes podem atualizar apenas os próprios pedidos ainda não pagos
DROP POLICY IF EXISTS "Customers can update own unpaid orders" ON public.orders;
CREATE POLICY "Customers can update own unpaid orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status IN ('pending', 'pending_payment')
)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('pending', 'pending_payment', 'expired', 'cancelled')
);

-- 3) Zero-Trust: confirmação de Pix Balcão apenas via service_role (webhook / edge function)
CREATE OR REPLACE FUNCTION public.enforce_pix_balcao_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
BEGIN
  IF NEW.payment_method = 'pix_balcao'
     AND NEW.status IN ('confirmed', 'paid', 'received', 'shipped', 'delivered')
     AND coalesce(OLD.status, '') IS DISTINCT FROM NEW.status
     AND coalesce(OLD.status, '') NOT IN ('confirmed', 'paid', 'received')
  THEN
    IF v_role <> 'service_role' AND auth.uid() IS NOT NULL THEN
      PERFORM public.log_security_event(
        'pix_balcao_unauthorized_confirmation',
        'critical',
        jsonb_build_object('order_id', NEW.id, 'attempted_status', NEW.status)
      );
      RAISE EXCEPTION 'Confirmacao de Pix Balcao permitida apenas via webhook ou funcao de atendimento autorizada';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pix_balcao_confirmation_trg ON public.orders;
CREATE TRIGGER enforce_pix_balcao_confirmation_trg
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pix_balcao_confirmation();