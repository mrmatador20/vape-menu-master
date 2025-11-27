-- Passo 1: Remover a view que depende da coluna
DROP VIEW IF EXISTS public_products;

-- Passo 2: Alterar o tipo da coluna discount_value para numeric
ALTER TABLE products 
ALTER COLUMN discount_value TYPE numeric USING discount_value::numeric;

-- Passo 3: Recriar a view public_products com a nova definição
CREATE OR REPLACE VIEW public_products AS
SELECT 
  id,
  name,
  description,
  price,
  category,
  subcategory,
  image,
  discount_type,
  discount_value,
  display_order,
  created_at,
  (stock > 0) as in_stock,
  get_product_availability(stock) as availability_status
FROM products;