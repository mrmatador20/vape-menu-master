-- =====================================================
-- CORREÇÃO DOS AVISOS DE SEGURANÇA DO LINTER
-- =====================================================

-- 1. Corrigir função get_product_availability para ter search_path seguro
CREATE OR REPLACE FUNCTION public.get_product_availability(stock_value integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN stock_value > 10 THEN 'em_estoque'
    WHEN stock_value > 0 THEN 'estoque_baixo'
    ELSE 'indisponivel'
  END;
$$;

-- 2. Recriar views com SECURITY INVOKER (usa permissões do usuário que consulta)
DROP VIEW IF EXISTS public.public_products CASCADE;
CREATE VIEW public.public_products
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  description,
  price,
  discount_value,
  discount_type,
  category,
  subcategory,
  image,
  display_order,
  created_at,
  get_product_availability(stock) as availability_status,
  (stock > 0) as in_stock
FROM products;

DROP VIEW IF EXISTS public.public_flavors CASCADE;
CREATE VIEW public.public_flavors
WITH (security_invoker = true)
AS
SELECT 
  id,
  product_id,
  name,
  price,
  created_at,
  get_product_availability(stock) as availability_status,
  (stock > 0) as in_stock
FROM flavors;

DROP VIEW IF EXISTS public.public_reviews CASCADE;
CREATE VIEW public.public_reviews
WITH (security_invoker = true)
AS
SELECT 
  id,
  product_id,
  rating,
  comment,
  created_at,
  substring(user_id::text, 1, 8) || '...' as anonymous_user
FROM reviews;

-- Garantir que as views sejam acessíveis publicamente
GRANT SELECT ON public.public_products TO anon, authenticated;
GRANT SELECT ON public.public_flavors TO anon, authenticated;
GRANT SELECT ON public.public_reviews TO anon, authenticated;