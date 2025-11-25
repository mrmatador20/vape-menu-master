-- Add missing phone_number column to notification_preferences if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='notification_preferences' AND column_name='phone_number') 
  THEN
    ALTER TABLE public.notification_preferences ADD COLUMN phone_number TEXT;
  END IF;
END $$;