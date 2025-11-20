-- Rename discount_percent to discount_value and add discount_type
ALTER TABLE products 
RENAME COLUMN discount_percent TO discount_value;

-- Add discount_type column
ALTER TABLE products 
ADD COLUMN discount_type text DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed'));

-- Update the check constraint for discount_value to allow higher values for fixed discounts
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_discount_percent_check;

ALTER TABLE products 
ADD CONSTRAINT products_discount_value_check CHECK (discount_value >= 0);