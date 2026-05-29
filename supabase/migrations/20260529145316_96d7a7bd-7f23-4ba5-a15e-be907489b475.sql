
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS position TEXT NOT NULL DEFAULT 'top',
  ADD COLUMN IF NOT EXISTS eyebrow TEXT,
  ADD COLUMN IF NOT EXISTS cta_label TEXT,
  ADD COLUMN IF NOT EXISTS cta_href TEXT;

ALTER TABLE public.banners
  DROP CONSTRAINT IF EXISTS banners_position_check;

ALTER TABLE public.banners
  ADD CONSTRAINT banners_position_check
  CHECK (position IN ('top', 'home_promo'));

CREATE INDEX IF NOT EXISTS idx_banners_position_active
  ON public.banners (position, is_active, display_order);
