-- Add 'mfa_backup_code_used' to the activity_type constraint
-- This allows logging when users authenticate using MFA backup codes

-- First, drop the existing constraint
ALTER TABLE public.user_activity_logs 
DROP CONSTRAINT IF EXISTS user_activity_logs_activity_type_check;

-- Recreate the constraint with the new activity type
ALTER TABLE public.user_activity_logs 
ADD CONSTRAINT user_activity_logs_activity_type_check 
CHECK (activity_type IN (
  'login',
  'login_failed',
  'password_changed',
  'mfa_enabled',
  'mfa_disabled',
  'mfa_backup_code_used',
  'logout',
  'profile_updated',
  'address_added',
  'address_updated',
  'address_deleted',
  'order_created',
  'order_cancelled',
  'review_created',
  'review_updated',
  'review_deleted',
  'admin_product_created',
  'admin_product_updated',
  'admin_product_deleted',
  'admin_order_status_changed',
  'admin_settings_changed',
  'sensitive_data_accessed',
  'unauthorized_access_attempt'
));