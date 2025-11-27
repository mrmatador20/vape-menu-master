-- Recriar a view public_products sem SECURITY DEFINER para seguir as melhores práticas de segurança
CREATE OR REPLACE VIEW public_products 
WITH (security_invoker = true) AS
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