import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
  department_id: string | null;
  department_slug: string | null;
  department_name: string | null;
  product_count?: number;
}

export const useCategories = (departmentId?: string | null) => {
  return useQuery({
    queryKey: ['categories', departmentId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('categories')
        .select('*, department:departments(id, slug, name)' as any)
        .order('display_order')
        .order('name');
      if (departmentId) q = q.eq('department_id', departmentId);
      const [catsRes, prodsRes] = await Promise.all([
        q,
        supabase.from('products').select('category'),
      ]);
      if (catsRes.error) throw catsRes.error;
      if (prodsRes.error) throw prodsRes.error;

      const counts: Record<string, number> = {};
      (prodsRes.data || []).forEach((p: any) => {
        if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
      });

      return ((catsRes.data || []) as any[]).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        display_order: c.display_order,
        created_at: c.created_at,
        department_id: c.department_id ?? null,
        department_slug: c.department?.slug ?? null,
        department_name: c.department?.name ?? null,
        product_count: counts[c.name] || 0,
      })) as Category[];
    },
  });
};
