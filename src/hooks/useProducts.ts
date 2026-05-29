import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/context/CartContext';
import { fetchStoreDiscount, resolveEffectiveDiscount } from './useStoreDiscount';

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const [{ data, error }, storeDiscount] = await Promise.all([
        supabase.from('products').select('*').order('category', { ascending: true }),
        fetchStoreDiscount(),
      ]);

      if (error) throw error;

      return data.map(product => {
        const effective = resolveEffectiveDiscount(
          product.discount_value,
          product.discount_type as 'percent' | 'fixed' | undefined,
          storeDiscount,
        );
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          subcategory: product.subcategory || undefined,
          price: Number(product.price),
          image: product.image,
          images: (product as any).images || (product.image ? [product.image] : []),
          description: product.description,
          stock: product.stock,
          min_stock: product.min_stock || 10,
          discount_value: effective.value,
          discount_type: effective.type,
          display_order: product.display_order || 0,
          visible_in_all: product.visible_in_all ?? true,
        };
      }).sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }
        if (a.stock > 0 && b.stock === 0) return -1;
        if (a.stock === 0 && b.stock > 0) return 1;
        return a.price - b.price;
      }) as Product[];
    },
  });
};
