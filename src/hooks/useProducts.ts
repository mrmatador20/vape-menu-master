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
        category: product.category,
        subcategory: product.subcategory || undefined,
        price: Number(product.price),
        image: product.image,
        description: product.description,
        stock: product.stock,
        min_stock: product.min_stock || 10,
        discount_value: product.discount_value || 0,
        discount_type: product.discount_type || 'percent',
      })).sort((a, b) => {
        // Produtos com estoque primeiro, esgotados por último
        if (a.stock > 0 && b.stock === 0) return -1;
        if (a.stock === 0 && b.stock > 0) return 1;
        // Se ambos têm estoque ou ambos estão esgotados, ordena por preço
        return a.price - b.price;
      }) as Product[];
    },
  });
};
