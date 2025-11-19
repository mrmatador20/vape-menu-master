-- Adicionar políticas para admins visualizarem todos os pedidos e order_items
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar política para admins atualizarem status de pedidos
CREATE POLICY "Admins can update order status"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Criar função para atualizar estoque quando pedido for finalizado
CREATE OR REPLACE FUNCTION public.update_stock_on_order_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se o status mudou para 'delivered' ou 'confirmed'
  IF (NEW.status IN ('delivered', 'confirmed') AND OLD.status != NEW.status) THEN
    -- Atualiza o estoque de cada produto no pedido
    UPDATE products
    SET stock = products.stock - order_items.quantity
    FROM order_items
    WHERE products.id = order_items.product_id
      AND order_items.order_id = NEW.id
      AND products.stock >= order_items.quantity; -- Previne estoque negativo
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função quando pedido for atualizado
CREATE TRIGGER update_stock_on_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.status IN ('delivered', 'confirmed'))
EXECUTE FUNCTION public.update_stock_on_order_completion();