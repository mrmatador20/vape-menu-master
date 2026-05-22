import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AffiliateCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  is_active: boolean;
}

export interface AffiliateConversion {
  id: string;
  order_id: string;
  discount_id: string;
  coupon_code: string;
  order_total: number;
  discount_amount: number;
  created_at: string;
}

export const useAffiliateData = () => {
  return useQuery({
    queryKey: ['affiliate-data'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Coupons linked to this user as influencer
      const { data: couponsRaw, error: couponsError } = await (supabase as any)
        .from('discounts')
        .select('id, code, type, value, is_active')
        .eq('influencer_user_id', user.id)
        .eq('is_influencer_coupon', true);

      if (couponsError && couponsError.code !== 'PGRST116') {
        // Ignore RLS no-rows; surface other errors silently as empty
        console.warn('[useAffiliateData] coupons:', couponsError);
      }

      const coupons = (couponsRaw ?? []) as AffiliateCoupon[];

      // Conversions visible to the user (RLS limits to influencer_user_id = auth.uid())
      const { data: conversionsRaw, error: convError } = await supabase
        .from('coupon_conversions')
        .select('id, order_id, discount_id, coupon_code, order_total, discount_amount, created_at')
        .order('created_at', { ascending: false });

      if (convError) {
        console.warn('[useAffiliateData] conversions:', convError);
      }

      const conversions = (conversionsRaw ?? []) as AffiliateConversion[];

      const totals = {
        totalUses: conversions.length,
        totalRevenue: conversions.reduce((s, c) => s + Number(c.order_total), 0),
        totalDiscount: conversions.reduce((s, c) => s + Number(c.discount_amount), 0),
      };

      return { coupons, conversions, totals };
    },
  });
};
