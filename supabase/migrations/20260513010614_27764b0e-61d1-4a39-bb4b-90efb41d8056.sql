ALTER TABLE public.flavors ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_flavors_product_order ON public.flavors(product_id, display_order);