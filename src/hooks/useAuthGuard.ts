import { supabase } from '@/integrations/supabase/client';

export interface AuthGuardResult {
  requires2FA: boolean;
  has2FAEnabled: boolean;
  isDeviceRemembered: boolean;
  factors?: any[];
}

export const useAuthGuard = () => {
  const checkAuthRequires2FA = async (): Promise<AuthGuardResult> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return { requires2FA: false, has2FAEnabled: false, isDeviceRemembered: false };
      }

      // Check if device is remembered
      const isDeviceRemembered = checkRememberedDevice(user.id);
      
      // Check if user has 2FA enabled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const has2FAEnabled = !!factorsData?.totp?.length;
      
      // Requires 2FA if: has 2FA enabled AND device is not remembered
      const requires2FA = has2FAEnabled && !isDeviceRemembered;

      return {
        requires2FA,
        has2FAEnabled,
        isDeviceRemembered,
        factors: factorsData?.totp || []
      };
    } catch (error) {
      console.error('Error checking auth requirements:', error);
      return { requires2FA: false, has2FAEnabled: false, isDeviceRemembered: false };
    }
  };

  const rememberDevice = (userId: string) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30); // 30 days
    
    const cookieValue = `device_remembered_${userId}=true; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
    document.cookie = cookieValue;
    
    console.log(`🔒 Device remembered for user ${userId} for 30 days`);
  };

  const checkRememberedDevice = (userId: string): boolean => {
    const cookieName = `device_remembered_${userId}`;
    const cookies = document.cookie.split(';');
    
    const isRemembered = cookies.some(cookie => {
      const [name, value] = cookie.trim().split('=');
      return name === cookieName && value === 'true';
    });

    return isRemembered;
  };

  const forgetDevice = (userId: string) => {
    // Set cookie expiration to past date to delete it
    document.cookie = `device_remembered_${userId}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=strict`;
    console.log(`🔓 Device forgotten for user ${userId}`);
  };

  return { 
    checkAuthRequires2FA, 
    rememberDevice, 
    checkRememberedDevice,
    forgetDevice 
  };
};
