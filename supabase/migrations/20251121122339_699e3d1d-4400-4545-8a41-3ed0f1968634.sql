-- Criar trigger para atualizar estoque apenas quando pedido for confirmado ou entregue
CREATE TRIGGER update_stock_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_on_order_completion();