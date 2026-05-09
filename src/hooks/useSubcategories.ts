import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  display_order: number;
  created_at: string;
  product_count?: number;
}

export const useSubcategories = (categoryId?: string | null, categoryName?: string | null) => {
  return useQuery({
    queryKey: ['subcategories', categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      const [subsRes, prodsRes] = await Promise.all([
        supabase
          .from('subcategories' as any)
          .select('*')
          .eq('category_id', categoryId!)
          .order('display_order')
          .order('name'),
        categoryName
          ? supabase.from('products').select('subcategory').eq('category', categoryName)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if ((subsRes as any).error) throw (subsRes as any).error;

      const counts: Record<string, number> = {};
      ((prodsRes as any).data || []).forEach((p: any) => {
        if (p.subcategory) counts[p.subcategory] = (counts[p.subcategory] || 0) + 1;
      });

      return (((subsRes as any).data || []) as any[]).map((s) => ({
        ...s,
        product_count: counts[s.name] || 0,
      })) as Subcategory[];
    },
  });
};
