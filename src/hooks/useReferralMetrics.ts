import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export const useReferralMetrics = () => {
  return useQuery({
    queryKey: ['referral-metrics'],
    queryFn: async () => {
      // Total de indicações (pedidos com referred_by_code)
      const { count: totalReferrals } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .not('referred_by_code', 'is', null)
        .neq('referred_by_code', '');

      // Indicações confirmadas
      const { count: confirmedReferrals } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .not('referred_by_code', 'is', null)
        .neq('referred_by_code', '')
        .in('status', ['confirmed', 'delivered'])
        .eq('referral_points_awarded', true);

      // Taxa de conversão
      const conversionRate =
        totalReferrals && totalReferrals > 0
          ? ((confirmedReferrals || 0) / totalReferrals) * 100
          : 0;

      // Total de cupons gerados
      const { count: totalCoupons } = await supabase
        .from('discounts')
        .select('*', { count: 'exact', head: true })
        .eq('is_referral_reward', true);

      // Cupons usados
      const { count: usedCoupons } = await supabase
        .from('discount_usage')
        .select('discount_id, discounts!inner(*)', { count: 'exact', head: true })
        .eq('discounts.is_referral_reward', true);

      // Pontos distribuídos total
      const { data: pointsData } = await supabase
        .from('referral_points')
        .select('total_earned');

      const totalPointsDistributed = pointsData?.reduce(
        (sum, record) => sum + (record.total_earned || 0),
        0
      ) || 0;

      // Distribuição por tier
      const { data: tierDistribution } = await supabase
        .from('referral_points')
        .select(`
          current_tier_id,
          referral_tiers(name, badge_color, min_referrals)
        `)
        .not('current_tier_id', 'is', null);

      const tierCounts: Record<string, { count: number; tier: any }> = {};
      tierDistribution?.forEach((record) => {
        const tier = record.referral_tiers as any;
        if (tier) {
          const key = tier.name;
          if (!tierCounts[key]) {
            tierCounts[key] = { count: 0, tier };
          }
          tierCounts[key].count++;
        }
      });

      // Top 10 indicadores
      const { data: topReferrers } = await supabase
        .from('referral_points')
        .select(`
          user_id,
          total_earned,
          total_successful_referrals,
          profiles(full_name),
          referral_tiers(name, badge_color)
        `)
        .order('total_successful_referrals', { ascending: false })
        .limit(10);

      // Métricas dos últimos 6 meses
      const monthlyMetrics = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));

        const { count: monthReferrals } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .not('referred_by_code', 'is', null)
          .neq('referred_by_code', '')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const { count: monthConfirmed } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .not('referred_by_code', 'is', null)
          .neq('referred_by_code', '')
          .in('status', ['confirmed', 'delivered'])
          .eq('referral_points_awarded', true)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const { count: monthCoupons } = await supabase
          .from('discounts')
          .select('*', { count: 'exact', head: true })
          .eq('is_referral_reward', true)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        monthlyMetrics.push({
          month: format(monthStart, 'MMM yyyy'),
          referrals: monthReferrals || 0,
          confirmed: monthConfirmed || 0,
          coupons: monthCoupons || 0,
        });
      }

      return {
        totalReferrals: totalReferrals || 0,
        confirmedReferrals: confirmedReferrals || 0,
        conversionRate,
        totalCoupons: totalCoupons || 0,
        usedCoupons: usedCoupons || 0,
        totalPointsDistributed,
        tierDistribution: Object.values(tierCounts),
        topReferrers: topReferrers || [],
        monthlyMetrics,
      };
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
};
