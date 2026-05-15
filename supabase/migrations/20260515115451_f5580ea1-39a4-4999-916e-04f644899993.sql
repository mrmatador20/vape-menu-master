
-- 1. Add influencer fields to discounts
ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS influencer_name TEXT,
  ADD COLUMN IF NOT EXISTS influencer_user_id UUID,
  ADD COLUMN IF NOT EXISTS is_influencer_coupon BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_discounts_is_influencer ON public.discounts(is_influencer_coupon) WHERE is_influencer_coupon = true;

-- 2. Coupon conversions table
CREATE TABLE IF NOT EXISTS public.coupon_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  discount_id UUID NOT NULL,
  coupon_code TEXT NOT NULL,
  influencer_name TEXT,
  influencer_user_id UUID,
  order_total NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, discount_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_conversions_code ON public.coupon_conversions(coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupon_conversions_created ON public.coupon_conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_conversions_discount ON public.coupon_conversions(discount_id);

ALTER TABLE public.coupon_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view coupon conversions"
  ON public.coupon_conversions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages coupon conversions"
  ON public.coupon_conversions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Trigger function: when order becomes confirmed/delivered, log influencer conversion
CREATE OR REPLACE FUNCTION public.track_influencer_coupon_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage RECORD;
BEGIN
  IF NEW.status IN ('confirmed', 'delivered')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('confirmed', 'delivered')) THEN

    FOR v_usage IN
      SELECT du.discount_id, d.code, d.influencer_name, d.influencer_user_id, d.value, d.type
      FROM public.discount_usage du
      JOIN public.discounts d ON d.id = du.discount_id
      WHERE du.order_id = NEW.id
        AND d.is_influencer_coupon = true
    LOOP
      INSERT INTO public.coupon_conversions (
        order_id, discount_id, coupon_code,
        influencer_name, influencer_user_id,
        order_total, discount_amount
      ) VALUES (
        NEW.id,
        v_usage.discount_id,
        v_usage.code,
        v_usage.influencer_name,
        v_usage.influencer_user_id,
        NEW.total_amount,
        CASE
          WHEN v_usage.type = 'percent' THEN ROUND(NEW.total_amount * v_usage.value / 100.0, 2)
          ELSE v_usage.value
        END
      )
      ON CONFLICT (order_id, discount_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[track_influencer_coupon_conversion] %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_influencer_coupon_conversion ON public.orders;
CREATE TRIGGER trg_track_influencer_coupon_conversion
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.track_influencer_coupon_conversion();
