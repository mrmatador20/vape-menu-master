-- =====================================================
-- CORREÇÃO FOCADA DE SEGURANÇA - PROBLEMAS CRÍTICOS
-- =====================================================

-- 1. REVIEWS: Remover acesso público que expõe user_id
-- A visualização pública já está protegida, apenas ajustamos

-- 2. EMAIL_VERIFICATION_CODES: Remover políticas inseguras
DROP POLICY IF EXISTS "System can insert verification codes" ON email_verification_codes;
DROP POLICY IF EXISTS "System can update verification codes" ON email_verification_codes;

-- Apenas service_role pode gerenciar (sem políticas = sem acesso público)

-- 3. SHIPPING_RATES: Restringir a usuários autenticados
DROP POLICY IF EXISTS "Taxas de entrega são públicas para leitura" ON shipping_rates;

CREATE POLICY "Authenticated users can read shipping rates"
ON shipping_rates FOR SELECT
TO authenticated
USING (true);

-- 4. SETTINGS: Restringir a usuários autenticados
DROP POLICY IF EXISTS "Configurações são públicas para leitura" ON settings;

CREATE POLICY "Authenticated users can read settings"
ON settings FOR SELECT
TO authenticated
USING (true);

-- 5. BANNERS: Ocultar campanhas futuras
DROP POLICY IF EXISTS "Banners são públicos para leitura" ON banners;

CREATE POLICY "Public can read active banners only"
ON banners FOR SELECT
TO public
USING (
  is_active = true 
  AND (scheduled_start IS NULL OR scheduled_start <= now())
  AND (scheduled_end IS NULL OR scheduled_end >= now())
);

-- 6. PRODUCTS: Criar função para status de disponibilidade
CREATE OR REPLACE FUNCTION public.get_product_availability(stock_value integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN stock_value > 10 THEN 'em_estoque'
    WHEN stock_value > 0 THEN 'estoque_baixo'
    ELSE 'indisponivel'
  END;
$$;

-- View pública segura para produtos (não expõe estoque exato)
CREATE OR REPLACE VIEW public.public_products AS
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

-- 7. FLAVORS: View pública segura (não expõe estoque exato)
CREATE OR REPLACE VIEW public.public_flavors AS
SELECT 
  id,
  product_id,
  name,
  price,
  created_at,
  get_product_availability(stock) as availability_status,
  (stock > 0) as in_stock
FROM flavors;

-- 8. REVIEWS: View pública que anonimiza user_id
CREATE OR REPLACE VIEW public.public_reviews AS
SELECT 
  id,
  product_id,
  rating,
  comment,
  created_at,
  substring(user_id::text, 1, 8) || '...' as anonymous_user
FROM reviews;