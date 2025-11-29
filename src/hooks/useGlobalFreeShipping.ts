import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShippingRate } from './useShippingRates';

// Hook para buscar configuração de frete grátis global (sem CEP específico)
export const useGlobalFreeShipping = () => {
  return useQuery({
    queryKey: ['global-free-shipping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('*')
        .is('cep', null)
        .not('free_shipping_min_value', 'is', null)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as ShippingRate | null;
    },
  });
};
