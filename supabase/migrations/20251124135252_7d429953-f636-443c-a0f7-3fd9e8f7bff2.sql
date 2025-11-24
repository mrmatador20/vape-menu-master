-- Create saved_addresses table
CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  cep TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saved addresses"
  ON public.saved_addresses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved addresses"
  ON public.saved_addresses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved addresses"
  ON public.saved_addresses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved addresses"
  ON public.saved_addresses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all saved addresses
CREATE POLICY "Admins can view all saved addresses"
  ON public.saved_addresses
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_saved_addresses_user_id ON public.saved_addresses(user_id);
CREATE INDEX idx_saved_addresses_is_default ON public.saved_addresses(user_id, is_default) WHERE is_default = true;

-- Trigger to update updated_at
CREATE TRIGGER update_saved_addresses_updated_at
  BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If setting this address as default, unset all other defaults for this user
  IF NEW.is_default = true THEN
    UPDATE public.saved_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to maintain single default address
CREATE TRIGGER ensure_single_default_address_trigger
  BEFORE INSERT OR UPDATE ON public.saved_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_address();