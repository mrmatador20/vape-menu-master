CREATE TABLE IF NOT EXISTS public.footer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_description text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  legal_controller_name text NOT NULL DEFAULT '',
  legal_city_state text NOT NULL DEFAULT '',
  copyright_year text NOT NULL DEFAULT '',
  custom_copyright_text text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.footer_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.footer_settings TO authenticated;
GRANT ALL ON public.footer_settings TO service_role;

ALTER TABLE public.footer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Footer settings are publicly readable" ON public.footer_settings;
CREATE POLICY "Footer settings are publicly readable"
ON public.footer_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert footer settings" ON public.footer_settings;
CREATE POLICY "Admins can insert footer settings"
ON public.footer_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can update footer settings" ON public.footer_settings;
CREATE POLICY "Admins can update footer settings"
ON public.footer_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can delete footer settings" ON public.footer_settings;
CREATE POLICY "Admins can delete footer settings"
ON public.footer_settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS set_footer_settings_updated_at ON public.footer_settings;
CREATE TRIGGER set_footer_settings_updated_at
BEFORE UPDATE ON public.footer_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.footer_settings (
  brand_description, contact_email, contact_phone,
  legal_controller_name, legal_city_state, copyright_year, custom_copyright_text
)
SELECT
  COALESCE((SELECT value FROM public.settings WHERE key = 'site_footer_brand_description'), 'Loja online de produtos selecionados.'),
  COALESCE((SELECT value FROM public.settings WHERE key = 'site_footer_contact_email'), 'foxvelour@gmail.com'),
  COALESCE((SELECT value FROM public.settings WHERE key = 'site_footer_contact_phone'), ''),
  COALESCE((SELECT value FROM public.settings WHERE key = 'site_footer_legal_controller'), 'Matheus Herminio Costa Cardoso'),
  COALESCE((SELECT value FROM public.settings WHERE key = 'site_footer_legal_city_state'), 'Cuité/PB'),
  COALESCE((SELECT value FROM public.settings WHERE key = 'site_footer_copyright_year'), ''),
  COALESCE((SELECT value FROM public.settings WHERE key = 'site_footer_custom_copyright'), '')
WHERE NOT EXISTS (SELECT 1 FROM public.footer_settings);