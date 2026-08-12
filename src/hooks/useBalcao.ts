import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type StockMovement = {
  id: string;
  product_id: string | null;
  flavor_id: string | null;
  product_name_snapshot: string;
  product_sku_snapshot: string | null;
  category_snapshot: string | null;
  movement_type: 'baixa_manual' | 'reversao' | 'entrada' | 'ajuste_manual' | 'venda_online' | 'venda_loja_fisica';
  reason: string | null;
  quantity: number;
  stock_before: number;
  stock_after: number;
  user_id: string | null;
  user_email_snapshot: string | null;
  user_role_snapshot: string | null;
  request_id: string;
  reversed_by_movement_id: string | null;
  reverses_movement_id: string | null;
  notes: string | null;
  order_id: string | null;
  created_at: string;
};

export interface StockMovementFilters {
  search?: string;
  productId?: string;
  userEmail?: string;
  type?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export const useStockMovements = (filters: StockMovementFilters = {}) => {
  return useQuery({
    queryKey: ['stock-movements', filters],
    queryFn: async () => {
      let q = supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 500);
      if (filters.productId) q = q.eq('product_id', filters.productId);
      if (filters.type) q = q.eq('movement_type', filters.type as any);
      if (filters.userEmail) q = q.ilike('user_email_snapshot', `%${filters.userEmail}%`);
      if (filters.from) q = q.gte('created_at', filters.from);
      if (filters.to) q = q.lte('created_at', filters.to);
      if (filters.search) {
        const s = filters.search.replace(/[,()]/g, ' ').trim();
        if (s) {
          q = q.or(
            `product_name_snapshot.ilike.%${s}%,product_sku_snapshot.ilike.%${s}%,user_email_snapshot.ilike.%${s}%`,
          );
        }
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StockMovement[];
    },
  });
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['products'] });
  qc.invalidateQueries({ queryKey: ['admin-products'] });
  qc.invalidateQueries({ queryKey: ['flavors'] });
  qc.invalidateQueries({ queryKey: ['stock-movements'] });
  qc.invalidateQueries({ queryKey: ['balcao-dashboard'] });
  // Dashboard principal (KPIs consolidados, estoque baixo e previsões)
  qc.invalidateQueries({ queryKey: ['admin-stats'] });
  qc.invalidateQueries({ queryKey: ['dashboard-channel-stats'] });
  qc.invalidateQueries({ queryKey: ['analytics-stock-forecast'] });
  qc.invalidateQueries({ queryKey: ['analytics-sales'] });
  qc.invalidateQueries({ queryKey: ['analytics-top-sold'] });
  qc.invalidateQueries({ queryKey: ['balcao-sales'] });
  qc.invalidateQueries({ queryKey: ['admin-sales-stats'] });
};

export const useBalcaoBaixa = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      product_id: string;
      flavor_id?: string | null;
      quantity: number;
      movement_type: 'baixa_manual' | 'venda_loja_fisica';
      reason: 'venda_loja' | 'produto_danificado' | 'troca' | 'ajuste_estoque' | 'outro';
      notes?: string | null;
      request_id: string;
    }) => {
      const { data, error } = await supabase.rpc('balcao_baixa_estoque', {
        p_product_id: p.product_id,
        p_flavor_id: p.flavor_id ?? null,
        p_quantity: p.quantity,
        p_movement_type: p.movement_type,
        p_reason: p.reason,
        p_notes: p.notes ?? null,
        p_request_id: p.request_id,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useBalcaoEntrada = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      product_id: string;
      flavor_id?: string | null;
      quantity: number;
      notes?: string | null;
      request_id: string;
    }) => {
      const { data, error } = await supabase.rpc('balcao_entrada_estoque', {
        p_product_id: p.product_id,
        p_flavor_id: p.flavor_id ?? null,
        p_quantity: p.quantity,
        p_notes: p.notes ?? null,
        p_request_id: p.request_id,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useBalcaoAjuste = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      product_id: string;
      flavor_id?: string | null;
      new_stock: number;
      notes?: string | null;
      request_id: string;
    }) => {
      const { data, error } = await supabase.rpc('balcao_ajuste_estoque', {
        p_product_id: p.product_id,
        p_flavor_id: p.flavor_id ?? null,
        p_new_stock: p.new_stock,
        p_notes: p.notes ?? null,
        p_request_id: p.request_id,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useBalcaoReverter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { movement_id: string; request_id: string; notes?: string | null }) => {
      const { data, error } = await supabase.rpc('balcao_reverter_baixa', {
        p_movement_id: p.movement_id,
        p_request_id: p.request_id,
        p_notes: p.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useBalcaoDashboard = () => {
  return useQuery({
    queryKey: ['balcao-dashboard'],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('stock_movements')
        .select('id, movement_type, quantity, product_id, product_name_snapshot, user_id, user_email_snapshot, created_at, stock_after')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Array<Partial<StockMovement>>;
    },
  });
};
