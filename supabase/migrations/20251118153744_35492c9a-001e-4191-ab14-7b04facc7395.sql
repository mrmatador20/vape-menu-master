-- Add stock column to flavors table
ALTER TABLE public.flavors 
ADD COLUMN stock integer NOT NULL DEFAULT 0;

-- Add comment explaining the stock logic
COMMENT ON COLUMN public.flavors.stock IS 'Stock quantity for this specific flavor. When a product has flavors, stock is managed per flavor. When a product has no flavors, stock is managed at the product level.';