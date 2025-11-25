-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notification logs" ON public.security_notification_logs;
DROP POLICY IF EXISTS "Admins can view all notification logs" ON public.security_notification_logs;
DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.security_notification_logs;
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Admins can view all preferences" ON public.notification_preferences;

-- Drop tables if they exist
DROP TABLE IF EXISTS public.security_notification_logs;
DROP TABLE IF EXISTS public.notification_preferences;

-- Create table for notification logs
CREATE TABLE public.security_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create table for user notification preferences
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  notify_suspicious_login BOOLEAN DEFAULT true,
  notify_failed_auth BOOLEAN DEFAULT true,
  notify_admin_actions BOOLEAN DEFAULT true,
  notify_password_change BOOLEAN DEFAULT true,
  notify_account_locked BOOLEAN DEFAULT true,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for security_notification_logs
ALTER TABLE public.security_notification_logs ENABLE ROW LEVEL SECURITY;

-- Policies for security_notification_logs
CREATE POLICY "Users can view their own notification logs"
ON public.security_notification_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification logs"
ON public.security_notification_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Service role can insert notification logs"
ON public.security_notification_logs
FOR INSERT
WITH CHECK (true);

-- Enable RLS for notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all preferences"
ON public.notification_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create indexes for performance
CREATE INDEX idx_security_notification_logs_user_id ON public.security_notification_logs(user_id);
CREATE INDEX idx_security_notification_logs_created_at ON public.security_notification_logs(created_at);
CREATE INDEX idx_security_notification_logs_status ON public.security_notification_logs(status);
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();