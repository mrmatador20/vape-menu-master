CREATE TABLE public.promo_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  coupon_code TEXT,
  button_label TEXT NOT NULL DEFAULT 'Comprar Agora',
  button_link TEXT NOT NULL DEFAULT '/',
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  rotation_seconds INTEGER NOT NULL DEFAULT 6,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promo_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_banners TO authenticated;
GRANT ALL ON public.promo_banners TO service_role;

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promo banners"
ON public.promo_banners FOR SELECT
USING (
  is_active = true
  AND (scheduled_start IS NULL OR scheduled_start <= now())
  AND (scheduled_end IS NULL OR scheduled_end >= now())
);

CREATE POLICY "Admins can view all promo banners"
ON public.promo_banners FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert promo banners"
ON public.promo_banners FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update promo banners"
ON public.promo_banners FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete promo banners"
ON public.promo_banners FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_promo_banners_updated_at
BEFORE UPDATE ON public.promo_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();