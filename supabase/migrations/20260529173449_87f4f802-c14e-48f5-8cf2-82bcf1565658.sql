ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS mobile_image_url text;
ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS overlay_opacity numeric NOT NULL DEFAULT 0.35;
ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS text_align text NOT NULL DEFAULT 'left';
ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS eyebrow text;