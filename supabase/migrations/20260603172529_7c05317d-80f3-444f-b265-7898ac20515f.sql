
-- Slugify helper (immutable, accent-stripping)
CREATE OR REPLACE FUNCTION public.slugify(v text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(
          translate(
            COALESCE(v, ''),
            'àáâãäåāăąçćčďđèéêëēĕėęěğģìíîïīĭįıłļľńņňñòóôõöōŏőøŕŗřśşšţťùúûüũūŭůűųŵýÿŷźżžÀÁÂÃÄÅĀĂĄÇĆČĎĐÈÉÊËĒĔĖĘĚĞĢÌÍÎÏĪĬĮİŁĻĽŃŅŇÑÒÓÔÕÖŌŎŐØŔŖŘŚŞŠŢŤÙÚÛÜŨŪŬŮŰŲŴÝŸŶŹŻŽ',
            'aaaaaaaaacccddeeeeeeeeegģiiiiiiiilllnnnnoooooooooorrrsssttuuuuuuuuuuwyyyzzzAAAAAAAAACCCDDEEEEEEEEEGGIIIIIIIILLLNNNNOOOOOOOOORRRSSSTTUUUUUUUUUUWYYYZZZ'
          )
        ),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

-- Generic slug-from-name trigger fn (uses NEW.name and NEW.slug)
CREATE OR REPLACE FUNCTION public.set_slug_from_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
  tbl text := TG_TABLE_NAME;
  exists_count int;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base := public.slugify(NEW.name);
  ELSE
    base := public.slugify(NEW.slug);
  END IF;

  IF base IS NULL OR base = '' THEN
    base := 'item';
  END IF;

  candidate := base;
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE slug = $1 AND id <> COALESCE($2, ''00000000-0000-0000-0000-000000000000''::uuid)',
      tbl
    ) INTO exists_count USING candidate, NEW.id;
    EXIT WHEN exists_count = 0;
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

-- CATEGORIES
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug text;
UPDATE public.categories SET slug = public.slugify(name) WHERE slug IS NULL OR slug = '';
-- Deduplicate
WITH d AS (
  SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY created_at, id) rn
  FROM public.categories
)
UPDATE public.categories c SET slug = c.slug || '-' || d.rn
FROM d WHERE d.id = c.id AND d.rn > 1;
ALTER TABLE public.categories ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON public.categories(slug);
DROP TRIGGER IF EXISTS trg_categories_slug ON public.categories;
CREATE TRIGGER trg_categories_slug BEFORE INSERT OR UPDATE OF name, slug ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_slug_from_name();

-- SUBCATEGORIES
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS slug text;
UPDATE public.subcategories SET slug = public.slugify(name) WHERE slug IS NULL OR slug = '';
WITH d AS (
  SELECT id, category_id, slug, row_number() OVER (PARTITION BY category_id, slug ORDER BY created_at, id) rn
  FROM public.subcategories
)
UPDATE public.subcategories s SET slug = s.slug || '-' || d.rn
FROM d WHERE d.id = s.id AND d.rn > 1;
ALTER TABLE public.subcategories ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_category_slug_key ON public.subcategories(category_id, slug);
DROP TRIGGER IF EXISTS trg_subcategories_slug ON public.subcategories;
CREATE TRIGGER trg_subcategories_slug BEFORE INSERT OR UPDATE OF name, slug ON public.subcategories
FOR EACH ROW EXECUTE FUNCTION public.set_slug_from_name();

-- PRODUCTS
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;
UPDATE public.products SET slug = public.slugify(name) WHERE slug IS NULL OR slug = '';
WITH d AS (
  SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY created_at, id) rn
  FROM public.products
)
UPDATE public.products p SET slug = p.slug || '-' || d.rn
FROM d WHERE d.id = p.id AND d.rn > 1;
ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON public.products(slug);
DROP TRIGGER IF EXISTS trg_products_slug ON public.products;
CREATE TRIGGER trg_products_slug BEFORE INSERT OR UPDATE OF name, slug ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_slug_from_name();
