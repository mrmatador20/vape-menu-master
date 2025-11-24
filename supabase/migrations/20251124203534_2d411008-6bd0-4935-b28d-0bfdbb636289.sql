-- Add password_changed_at column to profiles table
ALTER TABLE public.profiles
ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.password_changed_at IS 'Timestamp of the last password change. Used to enforce 90-day password rotation policy.';

-- Create function to check if password change is required (90 days)
CREATE OR REPLACE FUNCTION public.is_password_change_required(user_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_change TIMESTAMP WITH TIME ZONE;
  days_since_change INTEGER;
BEGIN
  SELECT password_changed_at INTO last_change
  FROM profiles
  WHERE id = user_profile_id;
  
  IF last_change IS NULL THEN
    RETURN FALSE; -- No enforcement for accounts without timestamp set
  END IF;
  
  days_since_change := EXTRACT(DAY FROM (now() - last_change));
  
  RETURN days_since_change >= 90;
END;
$$;

-- Create function to update password_changed_at when password is updated
CREATE OR REPLACE FUNCTION public.update_password_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This trigger should be called from application code when password changes
  NEW.password_changed_at = now();
  RETURN NEW;
END;
$$;