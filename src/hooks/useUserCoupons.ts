import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserCoupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  valid_until: string | null;
  times_used: number;
  max_uses: number | null;
  is_active: boolean;
  created_at: string;
}

export const useUserCoupons = () => {
  return useQuery({
    queryKey: ['user-coupons'],
    queryFn: async (): Promise<UserCoupon[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('discounts')
        .select('id, code, type, value, valid_until, times_used, max_uses, is_active, created_at')
        .eq('user_id', user.id)
        .eq('is_referral_reward', true)
        .eq('is_active', true)
        .lt('times_used', 1) // Only show unused coupons
        .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as UserCoupon[];
    },
  });
};
