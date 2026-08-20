CREATE TABLE public.home_hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  opacity integer NOT NULL DEFAULT 50 CHECK (opacity >= 0 AND opacity <= 100),
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_hero_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_hero_banners TO authenticated;
GRANT ALL ON public.home_hero_banners TO service_role;

ALTER TABLE public.home_hero_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view hero banners"
ON public.home_hero_banners FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert hero banners"
ON public.home_hero_banners FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update hero banners"
ON public.home_hero_banners FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete hero banners"
ON public.home_hero_banners FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_home_hero_banners_updated_at
BEFORE UPDATE ON public.home_hero_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();