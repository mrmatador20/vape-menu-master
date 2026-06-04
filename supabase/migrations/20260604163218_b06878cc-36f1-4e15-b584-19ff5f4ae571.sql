
-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.departments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departments are viewable by everyone"
  ON public.departments FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto slug + updated_at triggers (reuse existing functions)
CREATE TRIGGER set_departments_slug
  BEFORE INSERT OR UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_slug_from_name();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default departments
INSERT INTO public.departments (name, display_order) VALUES
  ('Feminino', 0),
  ('Masculino', 1),
  ('Unissex', 2);

-- Add department_id to categories
ALTER TABLE public.categories
  ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX idx_categories_department_id ON public.categories(department_id);
