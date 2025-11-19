-- Add min_stock column to products table for stock alerts
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock integer DEFAULT 10;

COMMENT ON COLUMN products.min_stock IS 'Minimum stock level before triggering low stock alert';