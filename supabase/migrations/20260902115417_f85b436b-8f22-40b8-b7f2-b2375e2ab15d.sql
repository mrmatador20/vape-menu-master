CREATE TABLE IF NOT EXISTS public.system_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_secrets TO authenticated;
GRANT ALL ON public.system_secrets TO service_role;

ALTER TABLE public.system_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read system secrets" ON public.system_secrets;
CREATE POLICY "Admins can read system secrets"
ON public.system_secrets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can insert system secrets" ON public.system_secrets;
CREATE POLICY "Admins can insert system secrets"
ON public.system_secrets FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can update system secrets" ON public.system_secrets;
CREATE POLICY "Admins can update system secrets"
ON public.system_secrets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can delete system secrets" ON public.system_secrets;
CREATE POLICY "Admins can delete system secrets"
ON public.system_secrets FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS update_system_secrets_updated_at ON public.system_secrets;
CREATE TRIGGER update_system_secrets_updated_at
BEFORE UPDATE ON public.system_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();