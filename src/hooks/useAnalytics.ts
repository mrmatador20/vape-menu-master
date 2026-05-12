import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Period = 7 | 30 | 90;

const since = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

export const useSalesAnalytics = (period: Period = 30) => {
  return useQuery({
    queryKey: ['analytics-sales', period],
    queryFn: async () => {
      const fromIso = since(period);
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .gte('created_at', fromIso);
      if (error) throw error;

      const valid = (orders || []).filter(
        (o) => o.status === 'confirmed' || o.status === 'delivered',
      );
      const revenue = valid.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const orderCount = valid.length;
      const avgTicket = orderCount > 0 ? revenue / orderCount : 0;

      // daily series
      const byDay = new Map<string, { date: string; revenue: number; orders: number }>();
      for (let i = period - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        byDay.set(k, { date: k, revenue: 0, orders: 0 });
      }
      valid.forEach((o) => {
        const k = (o.created_at || '').slice(0, 10);
        const e = byDay.get(k);
        if (e) {
          e.revenue += Number(o.total_amount || 0);
          e.orders += 1;
        }
      });

      return {
        revenue,
        orderCount,
        avgTicket,
        series: Array.from(byDay.values()),
      };
    },
  });
};

export const useTopSold = (period: Period = 30, limit = 10) => {
  return useQuery({
    queryKey: ['analytics-top-sold', period, limit],
    queryFn: async () => {
      const fromIso = since(period);
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, created_at, order_items(product_id, quantity, products(name, image))')
        .in('status', ['confirmed', 'delivered'])
        .gte('created_at', fromIso);
      if (error) throw error;

      const map = new Map<string, { product_id: string; name: string; image?: string | null; qty: number }>();
      (orders || []).forEach((o: any) => {
        (o.order_items || []).forEach((it: any) => {
          if (!it.product_id) return;
          const prev = map.get(it.product_id) || {
            product_id: it.product_id,
            name: it.products?.name || 'Produto',
            image: it.products?.image,
            qty: 0,
          };
          prev.qty += Number(it.quantity || 0);
          map.set(it.product_id, prev);
        });
      });
      return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, limit);
    },
  });
};

export const useViewsVsSales = (period: Period = 30) => {
  return useQuery({
    queryKey: ['analytics-views-vs-sales', period],
    queryFn: async () => {
      const fromIso = since(period);
      const [viewsRes, ordersRes, productsRes] = await Promise.all([
        supabase.from('product_views').select('product_id').gte('created_at', fromIso),
        supabase
          .from('orders')
          .select('status, created_at, order_items(product_id, quantity)')
          .in('status', ['confirmed', 'delivered'])
          .gte('created_at', fromIso),
        supabase.from('products').select('id, name, image'),
      ]);
      if (viewsRes.error) throw viewsRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (productsRes.error) throw productsRes.error;

      const viewMap = new Map<string, number>();
      (viewsRes.data || []).forEach((v: any) => {
        viewMap.set(v.product_id, (viewMap.get(v.product_id) || 0) + 1);
      });

      const soldMap = new Map<string, number>();
      (ordersRes.data || []).forEach((o: any) => {
        (o.order_items || []).forEach((it: any) => {
          if (!it.product_id) return;
          soldMap.set(it.product_id, (soldMap.get(it.product_id) || 0) + Number(it.quantity || 0));
        });
      });

      const rows = (productsRes.data || []).map((p: any) => {
        const views = viewMap.get(p.id) || 0;
        const sold = soldMap.get(p.id) || 0;
        const conv = views > 0 ? (sold / views) * 100 : 0;
        return { id: p.id, name: p.name, image: p.image, views, sold, conv };
      });
      rows.sort((a, b) => b.views - a.views);
      return rows;
    },
  });
};

export interface StockForecast {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  dailyAvg: number;
  daysLeft: number; // Infinity if no sales
  level: 'critical' | 'warning' | 'ok';
}

export const useStockForecast = (lookbackDays = 30) => {
  return useQuery({
    queryKey: ['analytics-stock-forecast', lookbackDays],
    queryFn: async (): Promise<StockForecast[]> => {
      const fromIso = since(lookbackDays);
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from('products').select('id, name, stock, min_stock'),
        supabase
          .from('orders')
          .select('status, created_at, order_items(product_id, quantity)')
          .in('status', ['confirmed', 'delivered'])
          .gte('created_at', fromIso),
      ]);
      if (productsRes.error) throw productsRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const soldMap = new Map<string, number>();
      (ordersRes.data || []).forEach((o: any) => {
        (o.order_items || []).forEach((it: any) => {
          if (!it.product_id) return;
          soldMap.set(it.product_id, (soldMap.get(it.product_id) || 0) + Number(it.quantity || 0));
        });
      });

      return (productsRes.data || [])
        .map((p: any) => {
          const sold = soldMap.get(p.id) || 0;
          const dailyAvg = sold / lookbackDays;
          const daysLeft = dailyAvg > 0 ? p.stock / dailyAvg : Infinity;
          let level: StockForecast['level'] = 'ok';
          if (p.stock === 0 || daysLeft < 3) level = 'critical';
          else if (daysLeft < 7 || p.stock <= (p.min_stock || 10)) level = 'warning';
          return {
            id: p.id,
            name: p.name,
            stock: p.stock,
            min_stock: p.min_stock || 10,
            dailyAvg,
            daysLeft,
            level,
          } as StockForecast;
        })
        .filter((p) => p.level !== 'ok')
        .sort((a, b) => a.daysLeft - b.daysLeft);
    },
  });
};
