import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InfluencerCouponSummary {
  discount_id: string;
  coupon_code: string;
  influencer_name: string | null;
  influencer_user_id: string | null;
  total_uses: number;
  total_revenue: number;
  total_discount: number;
  last_sale_at: string | null;
}

export interface InfluencerConversion {
  id: string;
  order_id: string;
  discount_id: string;
  coupon_code: string;
  influencer_name: string | null;
  order_total: number;
  discount_amount: number;
  created_at: string;
}

interface Params {
  from?: Date | null;
  to?: Date | null;
}

export const useInfluencerMetrics = ({ from, to }: Params = {}) => {
  return useQuery({
    queryKey: ['influencer-metrics', from?.toISOString() ?? null, to?.toISOString() ?? null],
    queryFn: async () => {
      let query = supabase
        .from('coupon_conversions')
        .select('*')
        .order('created_at', { ascending: false });

      if (from) query = query.gte('created_at', from.toISOString());
      if (to) query = query.lte('created_at', to.toISOString());

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as InfluencerConversion[];

      // Aggregate by coupon
      const map = new Map<string, InfluencerCouponSummary>();
      for (const r of rows) {
        const key = r.discount_id;
        const existing = map.get(key);
        if (existing) {
          existing.total_uses += 1;
          existing.total_revenue += Number(r.order_total);
          existing.total_discount += Number(r.discount_amount);
          if (!existing.last_sale_at || r.created_at > existing.last_sale_at) {
            existing.last_sale_at = r.created_at;
          }
        } else {
          map.set(key, {
            discount_id: r.discount_id,
            coupon_code: r.coupon_code,
            influencer_name: r.influencer_name,
            influencer_user_id: null,
            total_uses: 1,
            total_revenue: Number(r.order_total),
            total_discount: Number(r.discount_amount),
            last_sale_at: r.created_at,
          });
        }
      }

      const summaries = Array.from(map.values()).sort(
        (a, b) => b.total_revenue - a.total_revenue
      );

      const totals = {
        totalSales: rows.length,
        totalRevenue: rows.reduce((s, r) => s + Number(r.order_total), 0),
        totalDiscount: rows.reduce((s, r) => s + Number(r.discount_amount), 0),
        activeCoupons: summaries.length,
      };

      return { summaries, conversions: rows, totals };
    },
  });
};
