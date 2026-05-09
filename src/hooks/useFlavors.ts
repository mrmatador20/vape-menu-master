import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Flavor {
  id: string;
  product_id: string;
  name: string;
  stock: number;
  price?: number;
  color?: string | null;
  color_hex?: string | null;
  size?: string | null;
  sku?: string | null;
  created_at: string;
}

export const useFlavors = (productId: string) => {
  return useQuery({
    queryKey: ['flavors', productId],
    enabled: !!productId,
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
