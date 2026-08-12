import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SalesChannel = 'all' | 'online' | 'balcao';

export interface ChannelDayPoint {
  day: string;
  online: number;
  balcao: number;
  total: number;
}

export interface ChannelStats {
  onlineRevenue: number;
  balcaoRevenue: number;
  onlineOrders: number;
  balcaoOrders: number;
  totalRevenue: number;
  totalOrders: number;
  chart: ChannelDayPoint[];
}

const DAYS = 30;

/**
 * Consolida vendas da loja online (orders) com as vendas do balcão (stock_movements).
 * Receita do balcão = quantidade x preço atual da variação (ou do produto).
 */
export const useSalesChannelStats = () => {
  return useQuery({
    queryKey: ['dashboard-channel-stats'],
    queryFn: async (): Promise<ChannelStats> => {
      const sinceIso = new Date(Date.now() - (DAYS - 1) * 86400000).toISOString().slice(0, 10);

      const [ordersRes, movementsRes, productsRes, flavorsRes] = await Promise.all([
        supabase.from('orders').select('id, total_amount, status, created_at'),
        supabase
          .from('stock_movements')
          .select('id, product_id, flavor_id, quantity, movement_type, reason, reversed_by_movement_id, created_at')
          .in('movement_type', ['venda_loja_fisica', 'baixa_manual'])
          .limit(5000),
        supabase.from('products').select('id, price'),
        supabase.from('flavors').select('id, price'),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (movementsRes.error) throw movementsRes.error;

      const productPrice = new Map((productsRes.data ?? []).map((p) => [p.id, Number(p.price) || 0]));
      const flavorPrice = new Map(
        (flavorsRes.data ?? []).map((f) => [f.id, f.price == null ? null : Number(f.price)]),
      );

      const validOrders = (ordersRes.data ?? []).filter(
        (o) => o.status === 'delivered' || o.status === 'confirmed',
      );

      const balcaoSales = (movementsRes.data ?? []).filter(
        (m) =>
          !m.reversed_by_movement_id &&
          (m.movement_type === 'venda_loja_fisica' ||
            (m.movement_type === 'baixa_manual' && m.reason === 'venda_loja')),
      );

      const movementValue = (m: (typeof balcaoSales)[number]) => {
        const fp = m.flavor_id ? flavorPrice.get(m.flavor_id) : null;
        const unit = fp != null ? fp : m.product_id ? productPrice.get(m.product_id) ?? 0 : 0;
        return unit * (m.quantity ?? 0);
      };

      const onlineRevenue = validOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const balcaoRevenue = balcaoSales.reduce((s, m) => s + movementValue(m), 0);

      // Série diária dos últimos 30 dias
      const buckets = new Map<string, ChannelDayPoint>();
      for (let i = DAYS - 1; i >= 0; i--) {
        const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        buckets.set(key, { day: key.slice(5).split('-').reverse().join('/'), online: 0, balcao: 0, total: 0 });
      }

      for (const o of validOrders) {
        const key = (o.created_at ?? '').slice(0, 10);
        const b = buckets.get(key);
        if (b) b.online += Number(o.total_amount || 0);
      }
      for (const m of balcaoSales) {
        const key = (m.created_at ?? '').slice(0, 10);
        const b = buckets.get(key);
        if (b) b.balcao += movementValue(m);
      }
      const chart = Array.from(buckets.values()).map((b) => ({ ...b, total: b.online + b.balcao }));

      void sinceIso;

      return {
        onlineRevenue,
        balcaoRevenue,
        onlineOrders: validOrders.length,
        balcaoOrders: balcaoSales.length,
        totalRevenue: onlineRevenue + balcaoRevenue,
        totalOrders: validOrders.length + balcaoSales.length,
        chart,
      };
    },
  });
};

export const pickChannel = (stats: ChannelStats | undefined, channel: SalesChannel) => {
  if (!stats) return { revenue: 0, orders: 0, chart: [] as ChannelDayPoint[] };
  if (channel === 'online') {
    return { revenue: stats.onlineRevenue, orders: stats.onlineOrders, chart: stats.chart };
  }
  if (channel === 'balcao') {
    return { revenue: stats.balcaoRevenue, orders: stats.balcaoOrders, chart: stats.chart };
  }
  return { revenue: stats.totalRevenue, orders: stats.totalOrders, chart: stats.chart };
};
