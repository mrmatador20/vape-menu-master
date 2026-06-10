
-- BANNERS: remove SVG + GIF
DROP POLICY IF EXISTS "Admins can upload banners with restrictions" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update banners with restrictions" ON storage.objects;

CREATE POLICY "Admins can upload banners with restrictions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  AND (
    (metadata->>'mimetype') IS NULL
    OR (metadata->>'mimetype') IN ('image/jpeg','image/png','image/webp','image/avif')
  )
);

CREATE POLICY "Admins can update banners with restrictions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banners'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  bucket_id = 'banners'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  AND (
    (metadata->>'mimetype') IS NULL
    OR (metadata->>'mimetype') IN ('image/jpeg','image/png','image/webp','image/avif')
  )
);

-- PRODUCT-IMAGES: remove GIF
DROP POLICY IF EXISTS "Admins can upload product images with restrictions" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images with restrictions" ON storage.objects;

CREATE POLICY "Admins can upload product images with restrictions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  AND (
    (metadata->>'mimetype') IS NULL
    OR (metadata->>'mimetype') IN ('image/jpeg','image/png','image/webp','image/avif')
  )
);

CREATE POLICY "Admins can update product images with restrictions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  AND (
    (metadata->>'mimetype') IS NULL
    OR (metadata->>'mimetype') IN ('image/jpeg','image/png','image/webp','image/avif')
  )
);

-- AVATARS: enforce strict whitelist + 5MB
DROP POLICY IF EXISTS "Users can upload avatar with restrictions" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

CREATE POLICY "Users can upload avatar with restrictions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  AND (
    (metadata->>'mimetype') IS NULL
    OR (metadata->>'mimetype') IN ('image/jpeg','image/png','image/webp','image/avif')
  )
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  AND (
    (metadata->>'mimetype') IS NULL
    OR (metadata->>'mimetype') IN ('image/jpeg','image/png','image/webp','image/avif')
  )
);

-- REVIEW-IMAGES: enforce strict whitelist + 5MB
DROP POLICY IF EXISTS "Users upload own review images" ON storage.objects;

CREATE POLICY "Users upload own review images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'review-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (COALESCE((metadata->>'size')::int, 0) <= 5242880 OR metadata IS NULL)
  AND (
    (metadata->>'mimetype') IS NULL
    OR (metadata->>'mimetype') IN ('image/jpeg','image/png','image/webp','image/avif')
  )
);
