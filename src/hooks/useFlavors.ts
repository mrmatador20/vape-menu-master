import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Flavor {
  id: string;
  product_id: string;
  name: string;
}

export const useFlavors = (productId: string) => {
  return useQuery({
    queryKey: ['flavors', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flavors')
        .select('*')
        .eq('product_id', productId);
      
      if (error) throw error;
      return data as Flavor[];
    },
  });
};