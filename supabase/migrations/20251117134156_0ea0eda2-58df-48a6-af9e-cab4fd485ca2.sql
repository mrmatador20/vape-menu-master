-- Add max_uses field to discounts table
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS max_uses integer;

-- Create discount_usage table to track who used each discount
CREATE TABLE IF NOT EXISTS public.discount_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id uuid NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(discount_id, order_id)
);

-- Enable RLS
ALTER TABLE public.discount_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own discount usage
CREATE POLICY "Users can view their own discount usage"
ON public.discount_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create discount usage records for their orders
CREATE POLICY "Users can create discount usage for their orders"
ON public.discount_usage
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = discount_usage.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_discount_usage_discount_id ON public.discount_usage(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_user_id ON public.discount_usage(user_id);