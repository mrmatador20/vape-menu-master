-- Remove a constraint antiga que impede deletar produtos com pedidos
ALTER TABLE public.order_items 
DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- Adiciona nova constraint com SET NULL, preservando histórico de pedidos
ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE SET NULL;

-- Permite que product_id seja NULL para preservar histórico
ALTER TABLE public.order_items 
ALTER COLUMN product_id DROP NOT NULL;