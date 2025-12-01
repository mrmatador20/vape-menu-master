-- Add referral code to profiles table
ALTER TABLE public.profiles 
ADD COLUMN referral_code TEXT UNIQUE;

-- Create index for faster referral code lookups
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);

-- Create referral_rewards table (admin-configured rewards)
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  discount_code TEXT REFERENCES public.discounts(code) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_points table (user points balance)
CREATE TABLE public.referral_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create referral_transactions table (points history)
CREATE TABLE public.referral_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'adjusted', 'revoked')),
  points_amount INTEGER NOT NULL,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES public.referral_rewards(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_rewards (public can read active rewards, admin can manage)
CREATE POLICY "Public can view active rewards"
ON public.referral_rewards
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage rewards"
ON public.referral_rewards
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for referral_points (users see own points, admins see all)
CREATE POLICY "Users can view their own points"
ON public.referral_points
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points"
ON public.referral_points
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all points"
ON public.referral_points
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert points"
ON public.referral_points
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update points"
ON public.referral_points
FOR UPDATE
USING (true);

-- RLS Policies for referral_transactions (users see own transactions, admins see all)
CREATE POLICY "Users can view their own transactions"
ON public.referral_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.referral_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert transactions"
ON public.referral_transactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage transactions"
ON public.referral_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
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
    -- Generate 8-character alphanumeric code
    new_code := 'NEB' || UPPER(SUBSTRING(MD5(random()::text || clock_timestamp()::text) FROM 1 FOR 5));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Trigger to auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_referral_code();

-- Trigger to initialize referral points on profile creation
CREATE OR REPLACE FUNCTION public.initialize_referral_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.referral_points (user_id, points_balance, total_earned, total_redeemed)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_initialize_referral_points
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_referral_points();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_referral_rewards_updated_at
BEFORE UPDATE ON public.referral_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_points_updated_at
BEFORE UPDATE ON public.referral_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_referral_points_user_id ON public.referral_points(user_id);
CREATE INDEX idx_referral_transactions_user_id ON public.referral_transactions(user_id);
CREATE INDEX idx_referral_transactions_created_at ON public.referral_transactions(created_at DESC);

-- Add referred_by field to orders table to track referrals
ALTER TABLE public.orders 
ADD COLUMN referred_by_code TEXT,
ADD COLUMN referral_points_awarded BOOLEAN DEFAULT false;