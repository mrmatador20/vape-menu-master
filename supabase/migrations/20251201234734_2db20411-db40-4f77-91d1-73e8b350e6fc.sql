-- Add columns to discounts table for user-specific referral coupons
ALTER TABLE public.discounts
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN is_referral_reward BOOLEAN DEFAULT false,
ADD COLUMN times_used INTEGER DEFAULT 0,
ADD COLUMN reward_id UUID REFERENCES public.referral_rewards(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_discounts_user_id ON public.discounts(user_id);
CREATE INDEX idx_discounts_referral_reward ON public.discounts(is_referral_reward) WHERE is_referral_reward = true;

-- Update RLS policies for user-specific coupons
CREATE POLICY "Users can view their own referral coupons"
ON public.discounts
FOR SELECT
USING (
  (user_id = auth.uid() AND is_referral_reward = true)
  OR
  (user_id IS NULL AND is_active = true AND (valid_until IS NULL OR valid_until >= now()))
);

-- Function to generate unique coupon code
CREATE OR REPLACE FUNCTION generate_unique_coupon_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 8-character alphanumeric code
    new_code := 'REF' || UPPER(SUBSTRING(MD5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.discounts WHERE code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to auto-delete used referral coupons
CREATE OR REPLACE FUNCTION cleanup_used_referral_coupons()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete referral coupons that have been used and order is confirmed
  IF NEW.status IN ('confirmed', 'delivered') AND OLD.status NOT IN ('confirmed', 'delivered') THEN
    DELETE FROM public.discounts
    WHERE is_referral_reward = true
      AND times_used >= COALESCE(max_uses, 1)
      AND id IN (
        SELECT discount_id FROM public.discount_usage WHERE order_id = NEW.id
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to cleanup used coupons after order confirmation
CREATE TRIGGER trigger_cleanup_used_referral_coupons
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION cleanup_used_referral_coupons();