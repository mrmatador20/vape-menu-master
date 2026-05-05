ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_images_max;
ALTER TABLE public.products ADD CONSTRAINT products_images_max CHECK (cardinality(images) <= 12);

-- Backfill: copy existing single image into images array if empty
UPDATE public.products
SET images = ARRAY[image]
WHERE (images IS NULL OR cardinality(images) = 0)
  AND image IS NOT NULL
  AND image <> '';