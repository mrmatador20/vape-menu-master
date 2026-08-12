import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SalesChannelFilter = 'all' | 'online' | 'balcao';

export interface BalcaoSale {
  id: string;
  created_at: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  revenue: number;
}

/**
 * Vendas presenciais (PDV) derivadas de stock_movements.
 * Receita = quantidade x preço atual da variação (ou do produto).
 */
export const useBalcaoSales = (fromIso?: string, toIso?: string) => {
  return useQuery({
    queryKey: ['balcao-sales', fromIso ?? null, toIso ?? null],
    queryFn: async (): Promise<BalcaoSale[]> => {
      let q = supabase
        .from('stock_movements')
        .select(
          'id, product_id, flavor_id, product_name_snapshot, quantity, movement_type, reason, reversed_by_movement_id, created_at',
        )
        .in('movement_type', ['venda_loja_fisica', 'baixa_manual'])
        .limit(5000);

      if (fromIso) q = q.gte('created_at', fromIso);
      if (toIso) q = q.lt('created_at', toIso);

      const [movementsRes, productsRes, flavorsRes] = await Promise.all([
        q,
        supabase.from('products').select('id, price'),
        supabase.from('flavors').select('id, price'),
      ]);
      if (movementsRes.error) throw movementsRes.error;

      const productPrice = new Map((productsRes.data ?? []).map((p) => [p.id, Number(p.price) || 0]));
      const flavorPrice = new Map(
        (flavorsRes.data ?? []).map((f) => [f.id, f.price == null ? null : Number(f.price)]),
      );

      return (movementsRes.data ?? [])
        .filter(
          (m) =>
            !m.reversed_by_movement_id &&
            (m.movement_type === 'venda_loja_fisica' ||
              (m.movement_type === 'baixa_manual' && m.reason === 'venda_loja')),
        )
        .map((m) => {
          const fp = m.flavor_id ? flavorPrice.get(m.flavor_id) : null;
          const unit = fp != null ? fp : m.product_id ? productPrice.get(m.product_id) ?? 0 : 0;
          return {
            id: m.id,
            created_at: m.created_at,
            product_id: m.product_id,
            product_name: m.product_name_snapshot || 'Produto',
            quantity: m.quantity ?? 0,
            revenue: unit * (m.quantity ?? 0),
          };
        });
    },
  });
};
