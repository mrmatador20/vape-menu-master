import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'moderator' | 'user';
export type ExtendedRole = 'super_admin' | 'admin' | 'moderator' | 'operador' | 'user';

const fetchRoles = async (): Promise<ExtendedRole[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  if (error) return [];
  return (data ?? []).map((r: any) => r.role as ExtendedRole);
};

/**
 * Legacy hook: returns a value compatible with the existing 'admin' | 'moderator' | 'user' checks.
 * super_admin is mapped to 'admin' so existing admin guards keep working.
 * For Balcão-specific checks use `useBalcaoRole` instead.
 */
export const useUserRole = () => {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: async (): Promise<UserRole | null> => {
      const roles = await fetchRoles();
      if (roles.length === 0) return null;
      if (roles.includes('super_admin') || roles.includes('admin')) return 'admin';
      if (roles.includes('moderator')) return 'moderator';
      // 'operador' is a Balcão-only role and is not part of the legacy admin set
      if (roles.includes('user')) return 'user';
      return null;
    },
    retry: false,
  });
};

export const useUserRoles = () => {
  return useQuery({
    queryKey: ['user-roles-all'],
    queryFn: fetchRoles,
    retry: false,
  });
};

export const useBalcaoRole = () => {
  const { data: roles = [], isLoading } = useUserRoles();
  const has = (r: ExtendedRole) => roles.includes(r);
  const primary: ExtendedRole | null =
    has('super_admin') ? 'super_admin'
    : has('admin') ? 'admin'
    : has('moderator') ? 'moderator'
    : has('operador') ? 'operador'
    : has('user') ? 'user'
    : null;
  return {
    roles,
    role: primary,
    isLoading,
    canBaixa: has('super_admin') || has('admin') || has('operador'),
    canEntrada: has('super_admin') || has('admin'),
    canAjuste: has('super_admin'),
    canReverter: has('super_admin'),
    canSeeAllLogs: has('super_admin') || has('admin'),
    canExport: has('super_admin') || has('admin'),
  };
};
