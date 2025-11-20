-- Remove the public read policy on discounts table
DROP POLICY IF EXISTS "Descontos são públicos para leitura" ON discounts;

-- Create a secure function to validate discount codes
-- This prevents enumeration while allowing users to validate codes they have
CREATE OR REPLACE FUNCTION public.validate_discount_code(code_input text)
RETURNS TABLE (
  id uuid,
  code text,
  type text,
  value numeric,
  valid_until timestamptz,
  schedule_type text,
  start_time time,
  end_time time,
  day_of_week integer,
  max_uses integer,
  is_active boolean
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT 
    id, 
    code,
    type, 
    value, 
    valid_until,
    schedule_type,
    start_time,
    end_time,
    day_of_week,
    max_uses,
    is_active
  FROM discounts
  WHERE code = code_input
    AND is_active = true;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO authenticated;

-- Add RLS policy to allow admin access to discounts for management
CREATE POLICY "Admins can manage discounts"
ON discounts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));