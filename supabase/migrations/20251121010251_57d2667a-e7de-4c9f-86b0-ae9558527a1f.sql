-- Adicionar campo de preço na tabela flavors
ALTER TABLE public.flavors
ADD COLUMN price NUMERIC;

-- Comentário explicativo
COMMENT ON COLUMN public.flavors.price IS 'Preço específico para esta variante do produto. Se NULL, usa o preço base do produto.';