-- Allow anon to read store discount settings
CREATE POLICY "Public can read store discount settings"
ON public.settings
FOR SELECT
TO anon, authenticated
USING (key LIKE 'store_discount_%');

-- Seed default settings
INSERT INTO public.settings (key, value, description) VALUES
  ('store_discount_active', 'false', 'Ativa/desativa desconto global da loja'),
  ('store_discount_type', 'percent', 'Tipo do desconto global (percent ou fixed)'),
  ('store_discount_value', '0', 'Valor do desconto global da loja')
ON CONFLICT (key) DO NOTHING;