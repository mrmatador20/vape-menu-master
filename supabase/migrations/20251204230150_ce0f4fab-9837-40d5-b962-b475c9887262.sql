-- Add visibility column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS visible_in_all boolean NOT NULL DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN public.products.visible_in_all IS 'When false, product only appears in its category, not in "All Products" view';