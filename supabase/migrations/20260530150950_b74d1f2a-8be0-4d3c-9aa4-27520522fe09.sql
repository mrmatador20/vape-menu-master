-- Fase 2 de hardening de storage — Alternativa A (bloquear LIST anônimo)
-- Mantém public=true nos buckets, portanto getPublicUrl/CDN continuam servindo arquivos sem RLS.
-- Apenas o endpoint /storage/v1/object/list/<bucket> (que usa RLS SELECT em storage.objects) é restrito.

-- AVATARS
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars: authenticated can list/select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- BANNERS
DROP POLICY IF EXISTS "Banner images are publicly accessible" ON storage.objects;
CREATE POLICY "Banners: authenticated can list/select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'banners');

-- PRODUCT IMAGES
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
CREATE POLICY "Product images: authenticated can list/select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-images');

-- REVIEW IMAGES
DROP POLICY IF EXISTS "Review images publicly readable" ON storage.objects;
CREATE POLICY "Review images: authenticated can list/select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'review-images');