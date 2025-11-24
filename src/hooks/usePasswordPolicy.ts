import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePasswordPolicy = () => {
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [daysSinceChange, setDaysSinceChange] = useState<number | null>(null);

  const checkPasswordPolicy = async () => {
    setIsChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNeedsPasswordChange(false);
        return false;
      }

      // Get user profile with password_changed_at
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('password_changed_at')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking password policy:', error);
        return false;
      }

      if (!profile?.password_changed_at) {
        setNeedsPasswordChange(false);
        return false;
      }

      // Calculate days since last password change
      const lastChange = new Date(profile.password_changed_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastChange.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysSinceChange(diffDays);
      
      const needsChange = diffDays >= 90;
      setNeedsPasswordChange(needsChange);
      
      return needsChange;
    } catch (error) {
      console.error('Failed to check password policy:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const updatePasswordTimestamp = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ password_changed_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating password timestamp:', error);
      } else {
        setNeedsPasswordChange(false);
        setDaysSinceChange(0);
      }
    } catch (error) {
      console.error('Failed to update password timestamp:', error);
    }
  };

  return {
    needsPasswordChange,
    isChecking,
    daysSinceChange,
    checkPasswordPolicy,
    updatePasswordTimestamp,
  };
};
