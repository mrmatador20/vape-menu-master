import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateDeviceFingerprint, getDeviceName } from '@/lib/deviceFingerprint';

export const useDeviceCheck = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkDevice = async () => {
    setIsChecking(true);
    try {
      const deviceFingerprint = await generateDeviceFingerprint();
      const deviceName = getDeviceName();
      const userAgent = navigator.userAgent;

      console.log('Checking device:', { deviceFingerprint, deviceName });

      const { data, error } = await supabase.functions.invoke('check-device-trust', {
        body: {
          deviceFingerprint,
          deviceName,
          userAgent,
        },
      });

      if (error) {
        console.error('Device check error:', error);
        throw error;
      }

      console.log('Device check result:', data);

      return {
        isTrusted: data.isTrusted,
        isNewDevice: data.isNewDevice,
        device: data.device,
        deviceFingerprint,
      };
    } catch (error) {
      console.error('Failed to check device:', error);
      throw error;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkDevice,
    isChecking,
  };
};
