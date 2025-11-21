-- Add scheduling fields to banners table
ALTER TABLE public.banners
ADD COLUMN scheduled_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN scheduled_end TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance on scheduled banners
CREATE INDEX idx_banners_scheduled ON public.banners(scheduled_start, scheduled_end) 
WHERE is_active = true;