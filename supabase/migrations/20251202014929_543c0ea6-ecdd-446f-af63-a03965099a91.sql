-- Adicionar coluna para motivo de cancelamento na tabela orders
ALTER TABLE public.orders 
ADD COLUMN cancellation_reason TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.orders.cancellation_reason IS 'Motivo do cancelamento do pedido (preenchido apenas quando status = cancelled)';
