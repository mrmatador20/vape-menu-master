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
        console.log('🔒 No user session found');
        return { requires2FA: false, has2FAEnabled: false, isDeviceRemembered: false };
      }

      console.log('🔒 Checking 2FA requirements for user:', user.id);

      // Check if user has 2FA enabled FIRST
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        console.error('🔒 Error listing MFA factors:', factorsError);
        // CONSERVATIVE: If we can't check factors, assume 2FA is required
        return { requires2FA: true, has2FAEnabled: true, isDeviceRemembered: false };
      }

      const has2FAEnabled = !!factorsData?.totp?.length;
      console.log('🔒 User has 2FA enabled:', has2FAEnabled);

      // If user doesn't have 2FA enabled, no need to check device
      if (!has2FAEnabled) {
        console.log('🔒 2FA not enabled, allowing direct access');
        return {
          requires2FA: false,
          has2FAEnabled: false,
          isDeviceRemembered: false,
          factors: []
        };
      }

      // Check if device is remembered in database
      const isDeviceRemembered = await checkCurrentDevice();
      console.log('🔒 Device is remembered:', isDeviceRemembered);
      
      // Requires 2FA if: has 2FA enabled AND device is not remembered
      const requires2FA = has2FAEnabled && !isDeviceRemembered;
      console.log('🔒 Final decision - Requires 2FA:', requires2FA);

      return {
        requires2FA,
        has2FAEnabled,
        isDeviceRemembered,
        factors: factorsData?.totp || []
      };
    } catch (error) {
      console.error('🔒 Critical error checking auth requirements:', error);
      // CONSERVATIVE: In case of unexpected error, require 2FA for safety
      return { requires2FA: true, has2FAEnabled: true, isDeviceRemembered: false };
    }
  };

  // Register device in database (replaces cookie-based rememberDevice)
  const rememberDevice = async (userId: string) => {
    try {
      console.log(`🔒 rememberDevice: Registering device for user ${userId}`);
      await registerDevice();
      console.log(`🔒 rememberDevice: Device registered successfully`);
    } catch (error) {
      console.error('🔒 rememberDevice: Error registering device:', error);
      throw error;
    }
  };

  return { 
    checkAuthRequires2FA, 
    rememberDevice,
    checkCurrentDevice
  };
};
