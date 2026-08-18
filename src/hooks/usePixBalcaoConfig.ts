import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const PIX_BALCAO_KEYS = [
  'pix_balcao_key',
  'pix_balcao_merchant_name',
  'pix_balcao_merchant_city',
] as const;

export type PixBalcaoConfig = {
  pix_balcao_key: string;
  pix_balcao_merchant_name: string;
  pix_balcao_merchant_city: string;
};

export const usePixBalcaoConfig = () => {
  return useQuery({
    queryKey: ['pix-balcao-config'],
    queryFn: async (): Promise<PixBalcaoConfig> => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', PIX_BALCAO_KEYS as unknown as string[]);

      if (error) throw error;

      const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      return {
        pix_balcao_key: map.pix_balcao_key ?? '',
        pix_balcao_merchant_name: map.pix_balcao_merchant_name ?? '',
        pix_balcao_merchant_city: map.pix_balcao_merchant_city ?? '',
      };
    },
  });
};
