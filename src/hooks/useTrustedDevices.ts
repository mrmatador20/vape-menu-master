import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TrustedDevice {
  id: string;
  device_fingerprint: string;
  device_name: string | null;
  user_agent: string | null;
  ip_address: string | null;
  is_trusted: boolean;
  last_used_at: string;
  created_at: string;
  is_current?: boolean;
}

export const useTrustedDevices = () => {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false });

      if (error) throw error;

      // Get current device fingerprint to mark it
      const { generateDeviceFingerprint } = await import('@/lib/deviceFingerprint');
      const currentFingerprint = await generateDeviceFingerprint();

      const devicesWithCurrent = (data || []).map(device => ({
        ...device,
        is_current: device.device_fingerprint === currentFingerprint
      }));

      setDevices(devicesWithCurrent);
    } catch (error: any) {
      console.error('Error loading devices:', error);
      toast({
        title: 'Erro ao carregar dispositivos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeDevice = async (deviceId: string) => {
    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;

      toast({
        title: 'Dispositivo removido',
        description: 'O dispositivo foi removido da lista de dispositivos confiáveis.',
      });

      await loadDevices();
    } catch (error: any) {
      console.error('Error removing device:', error);
      toast({
        title: 'Erro ao remover dispositivo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const removeAllOtherDevices = async () => {
    setIsRemoving(true);
    try {
      const { generateDeviceFingerprint } = await import('@/lib/deviceFingerprint');
      const currentFingerprint = await generateDeviceFingerprint();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', user.id)
        .neq('device_fingerprint', currentFingerprint);

      if (error) throw error;

      toast({
        title: 'Dispositivos removidos',
        description: 'Todos os outros dispositivos foram removidos. Apenas o dispositivo atual permanece confiável.',
      });

      await loadDevices();
    } catch (error: any) {
      console.error('Error removing other devices:', error);
      toast({
        title: 'Erro ao remover dispositivos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  return {
    devices,
    isLoading,
    isRemoving,
    loadDevices,
    removeDevice,
    removeAllOtherDevices,
  };
};
