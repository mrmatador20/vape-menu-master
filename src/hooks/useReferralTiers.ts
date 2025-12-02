import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useReferralTiers = () => {
  return useQuery({
    queryKey: ['referral-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_tiers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

export const useCurrentUserTier = () => {
  return useQuery({
    queryKey: ['current-user-tier'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('referral_points')
        .select(`
          *,
          current_tier:referral_tiers(*)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
};
