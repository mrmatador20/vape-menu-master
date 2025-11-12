import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/context/CartContext';

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;

      return data.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category as 'v250' | 'v400',
        price: Number(product.price),
        image: product.image,
        description: product.description,
      })) as Product[];
    },
  });
};
