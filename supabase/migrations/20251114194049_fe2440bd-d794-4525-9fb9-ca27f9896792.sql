-- Add user_id column to orders table to link orders to authenticated users
ALTER TABLE public.orders 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Qualquer um pode criar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Qualquer um pode ver pedidos" ON public.orders;
DROP POLICY IF EXISTS "Qualquer um pode criar itens de pedido" ON public.order_items;
DROP POLICY IF EXISTS "Qualquer um pode ver itens de pedido" ON public.order_items;

-- Create secure RLS policies for orders
CREATE POLICY "Users can view only their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create secure RLS policies for order_items
CREATE POLICY "Users can view their own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create items for their own orders"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);