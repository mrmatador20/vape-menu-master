-- Add image_url to flavors for per-color variant images
ALTER TABLE public.flavors ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Track product views for analytics (views vs sales)
CREATE TABLE IF NOT EXISTS public.product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  user_id UUID,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_views_product_idx ON public.product_views(product_id);
CREATE INDEX IF NOT EXISTS product_views_created_idx ON public.product_views(created_at DESC);

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert a view event
CREATE POLICY "Anyone can record a product view"
ON public.product_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read raw events
CREATE POLICY "Admins can read product views"
ON public.product_views FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));