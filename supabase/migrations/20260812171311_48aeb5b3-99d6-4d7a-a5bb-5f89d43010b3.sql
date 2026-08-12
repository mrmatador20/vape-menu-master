CREATE OR REPLACE FUNCTION public.sync_product_stock_from_flavors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);
  IF v_product_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF EXISTS (SELECT 1 FROM public.flavors WHERE product_id = v_product_id) THEN
    UPDATE public.products p
       SET stock = COALESCE((SELECT SUM(f.stock) FROM public.flavors f WHERE f.product_id = v_product_id), 0)
     WHERE p.id = v_product_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_stock_from_flavors ON public.flavors;
CREATE TRIGGER trg_sync_product_stock_from_flavors
AFTER INSERT OR UPDATE OF stock OR DELETE ON public.flavors
FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_from_flavors();

-- Corrige os dados existentes
UPDATE public.products p
   SET stock = COALESCE(agg.total, 0)
  FROM (SELECT product_id, SUM(stock) AS total FROM public.flavors GROUP BY product_id) agg
 WHERE p.id = agg.product_id AND p.stock IS DISTINCT FROM agg.total;