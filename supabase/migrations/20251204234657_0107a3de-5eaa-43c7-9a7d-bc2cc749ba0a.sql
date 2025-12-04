-- ==========================================
-- STORAGE BUCKET SECURITY POLICIES
-- ==========================================

-- Add file size and MIME type restrictions for storage buckets
-- These policies prevent abuse and malicious file uploads

-- 1. AVATARS BUCKET POLICIES
-- Allow only image types, max 2MB

-- Drop existing policies if they exist to recreate with restrictions
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Public read access for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload avatars with restrictions
CREATE POLICY "Users can upload avatar with restrictions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  -- File size limit: 2MB (2097152 bytes)
  AND (COALESCE((metadata->>'size')::int, 0) <= 2097152 OR metadata IS NULL)
  -- MIME type restriction: only images
  AND (
    (metadata->>'mimetype') IS NULL 
    OR (metadata->>'mimetype') LIKE 'image/jpeg'
    OR (metadata->>'mimetype') LIKE 'image/png'
    OR (metadata->>'mimetype') LIKE 'image/gif'
    OR (metadata->>'mimetype') LIKE 'image/webp'
  )
);

-- Users can update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (COALESCE((metadata->>'size')::int, 0) <= 2097152 OR metadata IS NULL)
  AND (
    (metadata->>'mimetype') IS NULL 
    OR (metadata->>'mimetype') LIKE 'image/jpeg'
    OR (metadata->>'mimetype') LIKE 'image/png'
    OR (metadata->>'mimetype') LIKE 'image/gif'
    OR (metadata->>'mimetype') LIKE 'image/webp'
  )
);

-- Users can delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);


-- 2. BANNERS BUCKET POLICIES
-- Admin only, max 5MB, images only

DROP POLICY IF EXISTS "Admins can upload banners" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update banners" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete banners" ON storage.objects;
DROP POLICY IF EXISTS "Banner images are publicly accessible" ON storage.objects;

-- Public read access for banners
CREATE POLICY "Banner images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

-- Admins can upload banners with restrictions
CREATE POLICY "Admins can upload banners with restrictions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  -- File size limit: 5MB (5242880 bytes)
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  -- MIME type restriction: only images
  AND (
    (metadata->>'mimetype') IS NULL 
    OR (metadata->>'mimetype') LIKE 'image/jpeg'
    OR (metadata->>'mimetype') LIKE 'image/png'
    OR (metadata->>'mimetype') LIKE 'image/gif'
    OR (metadata->>'mimetype') LIKE 'image/webp'
    OR (metadata->>'mimetype') LIKE 'image/svg+xml'
  )
);

-- Admins can update banners
CREATE POLICY "Admins can update banners with restrictions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banners'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'banners'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  AND (
    (metadata->>'mimetype') IS NULL 
    OR (metadata->>'mimetype') LIKE 'image/jpeg'
    OR (metadata->>'mimetype') LIKE 'image/png'
    OR (metadata->>'mimetype') LIKE 'image/gif'
    OR (metadata->>'mimetype') LIKE 'image/webp'
    OR (metadata->>'mimetype') LIKE 'image/svg+xml'
  )
);

-- Admins can delete banners
CREATE POLICY "Admins can delete banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banners'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);


-- 3. PRODUCT-IMAGES BUCKET POLICIES  
-- Admin only, max 5MB, images only

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;

-- Public read access for product images
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Admins can upload product images with restrictions
CREATE POLICY "Admins can upload product images with restrictions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  -- File size limit: 5MB (5242880 bytes)
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  -- MIME type restriction: only images
  AND (
    (metadata->>'mimetype') IS NULL 
    OR (metadata->>'mimetype') LIKE 'image/jpeg'
    OR (metadata->>'mimetype') LIKE 'image/png'
    OR (metadata->>'mimetype') LIKE 'image/gif'
    OR (metadata->>'mimetype') LIKE 'image/webp'
  )
);

-- Admins can update product images
CREATE POLICY "Admins can update product images with restrictions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  AND (
    (metadata->>'mimetype') IS NULL 
    OR (metadata->>'mimetype') LIKE 'image/jpeg'
    OR (metadata->>'mimetype') LIKE 'image/png'
    OR (metadata->>'mimetype') LIKE 'image/gif'
    OR (metadata->>'mimetype') LIKE 'image/webp'
  )
);

-- Admins can delete product images
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);


-- 4. Add session timeout setting to settings table
INSERT INTO public.settings (key, value, description)
VALUES ('session_timeout_minutes', '30', 'Tempo limite de inatividade da sessão em minutos')
ON CONFLICT (key) DO NOTHING;
