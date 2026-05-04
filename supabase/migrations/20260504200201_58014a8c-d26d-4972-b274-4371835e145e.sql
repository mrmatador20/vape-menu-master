-- Permitir leitura pública das configurações de identidade e tema do site
-- (necessário para aplicar nome, slogan, cores antes do login e em qualquer reload)
CREATE POLICY "Public can read site identity and theme settings"
ON public.settings
FOR SELECT
TO anon, authenticated
USING (
  key LIKE 'site_%'
  OR key LIKE 'theme_%'
);