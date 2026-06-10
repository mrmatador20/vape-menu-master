import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'operador' | 'user';

const RANK: Record<UserRole, number> = {
  super_admin: 1,
  admin: 2,
  moderator: 3,
  operador: 4,
  user: 5,
};

export const useUserRole = () => {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: async (): Promise<UserRole | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      if (!data || data.length === 0) return null;

      // Return highest-privilege role
      const roles = data.map((r: any) => r.role as UserRole);
      roles.sort((a, b) => (RANK[a] ?? 99) - (RANK[b] ?? 99));
      return roles[0] ?? null;
    },
    retry: false,
  });
};

export const useBalcaoRole = () => {
  const { data: role, isLoading } = useUserRole();
  return {
    role,
    isLoading,
    canBaixa: role === 'super_admin' || role === 'admin' || role === 'operador',
    canEntrada: role === 'super_admin' || role === 'admin',
    canAjuste: role === 'super_admin',
    canReverter: role === 'super_admin',
    canSeeAllLogs: role === 'super_admin' || role === 'admin',
    canExport: role === 'super_admin' || role === 'admin',
  };
};
