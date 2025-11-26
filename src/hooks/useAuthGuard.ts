import { supabase } from '@/integrations/supabase/client';
import { useTrustedDevices } from './useTrustedDevices';

export interface AuthGuardResult {
  requires2FA: boolean;
  has2FAEnabled: boolean;
  isDeviceRemembered: boolean;
  factors?: any[];
}

export const useAuthGuard = () => {
  const { checkCurrentDevice, registerDevice } = useTrustedDevices();

  const checkAuthRequires2FA = async (): Promise<AuthGuardResult> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return { requires2FA: false, has2FAEnabled: false, isDeviceRemembered: false };
      }

      // Check if device is remembered in database
      const isDeviceRemembered = await checkCurrentDevice();
      
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

  // Register device in database (replaces cookie-based rememberDevice)
  const rememberDevice = async (userId: string) => {
    try {
      await registerDevice();
      console.log(`🔒 Device registered in database for user ${userId}`);
    } catch (error) {
      console.error('Error registering device:', error);
    }
  };

  return { 
    checkAuthRequires2FA, 
    rememberDevice,
    checkCurrentDevice
  };
};
