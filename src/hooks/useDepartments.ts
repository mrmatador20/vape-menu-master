import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Department {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments' as any)
        .select('*')
        .order('display_order')
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as Department[];
    },
  });
};
