
-- 1. Add optional image and unique constraint
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS image_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_user_product_unique'
  ) THEN
    -- Remove duplicates first (keep oldest)
    DELETE FROM public.reviews r1
    USING public.reviews r2
    WHERE r1.user_id = r2.user_id
      AND r1.product_id = r2.product_id
      AND r1.created_at > r2.created_at;
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_user_product_unique UNIQUE (user_id, product_id);
  END IF;
END $$;

-- 2. Helper function to validate purchase
CREATE OR REPLACE FUNCTION public.user_purchased_product(_user_id uuid, _product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = _user_id
      AND oi.product_id = _product_id
      AND o.status IN ('delivered', 'confirmed')
  )
$$;

-- 3. Replace INSERT policy: only real buyers can review
DROP POLICY IF EXISTS "Usuários autenticados podem criar avaliações" ON public.reviews;
CREATE POLICY "Only verified buyers can create reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.user_purchased_product(auth.uid(), product_id)
);

-- 4. Recreate public view to include image_url
DROP VIEW IF EXISTS public.public_reviews;
CREATE VIEW public.public_reviews AS
SELECT
  id,
  product_id,
  rating,
  comment,
  image_url,
  created_at,
  substring(user_id::text, 1, 8) || '...'::text AS anonymous_user
FROM public.reviews;

GRANT SELECT ON public.public_reviews TO anon, authenticated;

-- 5. Storage bucket for optional review photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Review images publicly readable" ON storage.objects;
CREATE POLICY "Review images publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-images');

DROP POLICY IF EXISTS "Users upload own review images" ON storage.objects;
CREATE POLICY "Users upload own review images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'review-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own review images" ON storage.objects;
CREATE POLICY "Users delete own review images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'review-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
