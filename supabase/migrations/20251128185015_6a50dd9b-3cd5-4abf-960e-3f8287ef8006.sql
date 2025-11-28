-- Add expires_at column to orders table for PIX QR code expiration
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;