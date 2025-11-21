-- Add transition type field to banners table
ALTER TABLE public.banners 
ADD COLUMN transition_type TEXT NOT NULL DEFAULT 'fade';

-- Add check constraint for valid transition types
ALTER TABLE public.banners
ADD CONSTRAINT valid_transition_type 
CHECK (transition_type IN ('fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom'));