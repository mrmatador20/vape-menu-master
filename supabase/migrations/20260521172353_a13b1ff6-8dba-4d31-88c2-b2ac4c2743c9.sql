-- Replace stock update function to also decrement per-variant (flavors) stock
CREATE OR REPLACE FUNCTION public.update_stock_on_order_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.status IN ('delivered', 'confirmed') AND OLD.status IS DISTINCT FROM NEW.status
      AND (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'confirmed'))) THEN

    -- Decrement product base stock
    UPDATE products
    SET stock = products.stock - order_items.quantity
    FROM order_items
    WHERE products.id = order_items.product_id
      AND order_items.order_id = NEW.id
      AND products.stock >= order_items.quantity;

    -- Decrement variant (flavor) stock by matching name/size/color
    -- Accepts oi.flavor formats:
    --   "Tamanho M"
    --   "Tamanho Unico • Azul Piscina"
    --   "<name> • <color>"
    UPDATE flavors f
    SET stock = GREATEST(f.stock - oi.quantity, 0)
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND f.product_id = oi.product_id
      AND oi.flavor IS NOT NULL
      AND f.id = (
        SELECT fl.id FROM flavors fl
        WHERE fl.product_id = oi.product_id
          AND (
            fl.name = oi.flavor
            OR (position(' • ' in oi.flavor) > 0
                AND fl.name = split_part(oi.flavor, ' • ', 1)
                AND fl.color = split_part(oi.flavor, ' • ', 2))
            OR fl.name || COALESCE(' • ' || fl.color, '') = oi.flavor
            OR fl.size = oi.flavor
          )
        ORDER BY
          CASE WHEN fl.name = oi.flavor THEN 0
               WHEN position(' • ' in oi.flavor) > 0
                    AND fl.name = split_part(oi.flavor, ' • ', 1)
                    AND fl.color = split_part(oi.flavor, ' • ', 2) THEN 1
               ELSE 2 END
        LIMIT 1
      );
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_update_stock_on_order_completion ON public.orders;
CREATE TRIGGER trg_update_stock_on_order_completion
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_on_order_completion();

-- Retroactive fix: decrement variant stock for already confirmed/delivered orders
-- that clearly weren't applied. We do a one-time backfill using same matching logic.
WITH matched AS (
  SELECT
    oi.id AS oi_id,
    oi.quantity,
    (
      SELECT fl.id FROM flavors fl
      WHERE fl.product_id = oi.product_id
        AND (
          fl.name = oi.flavor
          OR (position(' • ' in oi.flavor) > 0
              AND fl.name = split_part(oi.flavor, ' • ', 1)
              AND fl.color = split_part(oi.flavor, ' • ', 2))
          OR fl.name || COALESCE(' • ' || fl.color, '') = oi.flavor
          OR fl.size = oi.flavor
        )
      ORDER BY
        CASE WHEN fl.name = oi.flavor THEN 0
             WHEN position(' • ' in oi.flavor) > 0
                  AND fl.name = split_part(oi.flavor, ' • ', 1)
                  AND fl.color = split_part(oi.flavor, ' • ', 2) THEN 1
             ELSE 2 END
      LIMIT 1
    ) AS flavor_id
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status IN ('confirmed', 'delivered')
    AND oi.flavor IS NOT NULL
),
agg AS (
  SELECT flavor_id, SUM(quantity)::int AS total_qty
  FROM matched
  WHERE flavor_id IS NOT NULL
  GROUP BY flavor_id
)
UPDATE flavors f
SET stock = GREATEST(f.stock - agg.total_qty, 0)
FROM agg
WHERE f.id = agg.flavor_id
  AND NOT EXISTS (
    -- only backfill where we haven't yet applied: heuristic — skip if stock already 0
    SELECT 1 WHERE f.stock = 0
  );