ALTER TABLE public.home_hero_banners
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS show_text_overlay boolean NOT NULL DEFAULT true;