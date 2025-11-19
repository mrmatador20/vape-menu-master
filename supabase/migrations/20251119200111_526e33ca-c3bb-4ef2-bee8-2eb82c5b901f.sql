-- Adicionar coluna de subcategoria à tabela products
ALTER TABLE public.products 
ADD COLUMN subcategory TEXT;

-- Adicionar índice para melhorar performance de consultas por subcategoria
CREATE INDEX idx_products_subcategory ON public.products(subcategory);

-- Adicionar índice composto para consultas por categoria e subcategoria
CREATE INDEX idx_products_category_subcategory ON public.products(category, subcategory);