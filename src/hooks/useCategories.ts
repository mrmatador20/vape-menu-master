import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
  product_count?: number;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const [catsRes, prodsRes] = await Promise.all([
        supabase.from('categories').select('*').order('display_order').order('name'),
        supabase.from('products').select('category'),
      ]);
      if (catsRes.error) throw catsRes.error;
      if (prodsRes.error) throw prodsRes.error;

      const counts: Record<string, number> = {};
      (prodsRes.data || []).forEach((p: any) => {
        if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
      });

      return (catsRes.data || []).map((c: any) => ({
        ...c,
        product_count: counts[c.name] || 0,
      })) as Category[];
    },
  });
};
