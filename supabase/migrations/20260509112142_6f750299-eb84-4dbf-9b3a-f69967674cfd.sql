ALTER TABLE public.flavors 
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS color_hex text;