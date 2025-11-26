import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logActivity } from './useActivityLogs';

interface TrustedDevice {
  id: string;
  device_fingerprint: string;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_trusted: boolean;
  created_at: string;
  last_used_at: string;
}

// Generate a device fingerprint based on browser characteristics
const generateDeviceFingerprint = (): string => {
  const nav = navigator;
  const screen = window.screen;
  
  const fingerprint = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
};

const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';
  
  // Detect browser
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';
  
  return `${browser} on ${os}`;
};

export const useTrustedDevices = () => {
  const queryClient = useQueryClient();

  // Fetch all trusted devices for current user
  const { data: devices, isLoading } = useQuery({
    queryKey: ['trusted-devices'],
    queryFn: async (): Promise<TrustedDevice[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_trusted', true)
        .order('last_used_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Register a new trusted device
  const registerDevice = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const deviceFingerprint = generateDeviceFingerprint();
      const deviceName = getDeviceName();

      // Check if device already exists
      const { data: existingDevice } = await supabase
        .from('trusted_devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceFingerprint)
        .maybeSingle();

      if (existingDevice) {
        // Update last_used_at
        const { error: updateError } = await supabase
          .from('trusted_devices')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', existingDevice.id);

        if (updateError) throw updateError;
        return { isNew: false };
      }

      // Create new trusted device
      const { error: insertError } = await supabase
        .from('trusted_devices')
        .insert({
          user_id: user.id,
          device_fingerprint: deviceFingerprint,
          device_name: deviceName,
          ip_address: null, // Could be fetched from a service
          user_agent: navigator.userAgent,
          is_trusted: true,
          last_used_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Log activity
      await logActivity('device_trusted', {
        metadata: { 
          device_fingerprint: deviceFingerprint,
          device_name: deviceName 
        }
      });

      // Call edge function to send notification email
      try {
        await supabase.functions.invoke('notify-new-device', {
          body: { 
            deviceName,
            deviceFingerprint,
            userAgent: navigator.userAgent
          }
        });
      } catch (emailError) {
        console.error('Failed to send device notification email:', emailError);
        // Don't fail the entire operation if email fails
      }

      return { isNew: true };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trusted-devices'] });
      if (result.isNew) {
        toast.success('Dispositivo lembrado com sucesso');
      }
    },
    onError: (error: any) => {
      console.error('Error registering device:', error);
      toast.error('Erro ao registrar dispositivo');
    },
  });

  // Check if current device is trusted
  const checkCurrentDevice = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const deviceFingerprint = generateDeviceFingerprint();

      const { data } = await supabase
        .from('trusted_devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_trusted', true)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking device:', error);
      return false;
    }
  };

  // Revoke a trusted device
  const revokeDevice = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from('trusted_devices')
        .update({ is_trusted: false })
        .eq('id', deviceId);

      if (error) throw error;

      // Log activity
      await logActivity('device_revoked', {
        metadata: { device_id: deviceId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trusted-devices'] });
      toast.success('Dispositivo revogado com sucesso');
    },
    onError: (error: any) => {
      console.error('Error revoking device:', error);
      toast.error('Erro ao revogar dispositivo');
    },
  });

  // Rename a device
  const renameDevice = useMutation({
    mutationFn: async ({ deviceId, newName }: { deviceId: string; newName: string }) => {
      const { error } = await supabase
        .from('trusted_devices')
        .update({ device_name: newName })
        .eq('id', deviceId);

      if (error) throw error;

      // Log activity
      await logActivity('device_renamed', {
        metadata: { device_id: deviceId, new_name: newName }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trusted-devices'] });
      toast.success('Nome do dispositivo atualizado');
    },
    onError: (error: any) => {
      console.error('Error renaming device:', error);
      toast.error('Erro ao renomear dispositivo');
    },
  });

  // Revoke all devices except current
  const revokeAllOthers = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const currentFingerprint = generateDeviceFingerprint();

      const { error } = await supabase
        .from('trusted_devices')
        .update({ is_trusted: false })
        .eq('user_id', user.id)
        .neq('device_fingerprint', currentFingerprint);

      if (error) throw error;

      // Log activity
      await logActivity('all_devices_revoked', {
        metadata: { except_current: true }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trusted-devices'] });
      toast.success('Todos os outros dispositivos foram revogados');
    },
    onError: (error: any) => {
      console.error('Error revoking devices:', error);
      toast.error('Erro ao revogar dispositivos');
    },
  });

  return {
    devices: devices || [],
    isLoading,
    registerDevice: registerDevice.mutateAsync,
    revokeDevice: revokeDevice.mutateAsync,
    renameDevice: renameDevice.mutateAsync,
    revokeAllOthers: revokeAllOthers.mutateAsync,
    checkCurrentDevice,
    getCurrentFingerprint: generateDeviceFingerprint,
  };
};
