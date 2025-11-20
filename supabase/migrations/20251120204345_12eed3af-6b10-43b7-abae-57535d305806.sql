-- Add discount_percent column to products table
ALTER TABLE products 
ADD COLUMN discount_percent integer DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);