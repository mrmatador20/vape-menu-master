-- Add FK constraint linking discounts.influencer_user_id to profiles(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discounts_influencer_user_id_fkey'
  ) THEN
    ALTER TABLE public.discounts
      ADD CONSTRAINT discounts_influencer_user_id_fkey
      FOREIGN KEY (influencer_user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Validation trigger: if is_influencer_coupon is true, require either name or user_id
CREATE OR REPLACE FUNCTION public.validate_influencer_coupon()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_influencer_coupon = true THEN
    IF (NEW.influencer_user_id IS NULL)
       AND (NEW.influencer_name IS NULL OR length(trim(NEW.influencer_name)) = 0) THEN
      RAISE EXCEPTION 'Cupom de influencer requer um parceiro vinculado ou nome do responsável';
    END IF;

    -- If influencer_user_id provided, ensure it exists in profiles (defense in depth)
    IF NEW.influencer_user_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.influencer_user_id) THEN
      RAISE EXCEPTION 'Parceiro/influencer informado não existe';
    END IF;
  ELSE
    -- Non-influencer coupons cannot carry influencer metadata
    NEW.influencer_user_id := NULL;
    NEW.influencer_name := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_influencer_coupon ON public.discounts;
CREATE TRIGGER trg_validate_influencer_coupon
BEFORE INSERT OR UPDATE ON public.discounts
FOR EACH ROW
EXECUTE FUNCTION public.validate_influencer_coupon();

-- Index for analytics queries by influencer
CREATE INDEX IF NOT EXISTS idx_discounts_influencer_user_id
  ON public.discounts(influencer_user_id)
  WHERE influencer_user_id IS NOT NULL;