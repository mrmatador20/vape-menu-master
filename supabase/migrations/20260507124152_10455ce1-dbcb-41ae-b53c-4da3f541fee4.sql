
-- Add new fields to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS address_complement TEXT,
  ADD COLUMN IF NOT EXISTS address_state TEXT;

-- Add complement to saved_addresses
ALTER TABLE public.saved_addresses
  ADD COLUMN IF NOT EXISTS complement TEXT;

-- Update orders status check constraint to include 'shipped' and 'pending_payment'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'pending_payment', 'confirmed', 'shipped', 'delivered', 'cancelled'));
