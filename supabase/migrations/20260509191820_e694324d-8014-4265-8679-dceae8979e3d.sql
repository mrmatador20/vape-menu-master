
-- Subcategories table
CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcategorias são públicas para leitura"
  ON public.subcategories FOR SELECT USING (true);

CREATE POLICY "Admins podem inserir subcategorias"
  ON public.subcategories FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar subcategorias"
  ON public.subcategories FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar subcategorias"
  ON public.subcategories FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Flavors: SKU and size
ALTER TABLE public.flavors
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS size text;

-- Backfill categories from existing products
INSERT INTO public.categories (name, display_order)
SELECT DISTINCT p.category, 0
FROM public.products p
WHERE p.category IS NOT NULL
  AND p.category <> ''
  AND NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.name = p.category);

-- Backfill subcategories
INSERT INTO public.subcategories (category_id, name, display_order)
SELECT DISTINCT c.id, p.subcategory, 0
FROM public.products p
JOIN public.categories c ON c.name = p.category
WHERE p.subcategory IS NOT NULL
  AND p.subcategory <> ''
ON CONFLICT (category_id, name) DO NOTHING;
