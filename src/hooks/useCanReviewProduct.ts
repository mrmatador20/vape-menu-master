import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica se o usuário autenticado pode avaliar um produto:
 * - hasPurchased: tem pedido com status 'delivered' ou 'confirmed' contendo o produto
 * - hasReviewed: já enviou uma avaliação para o produto
 */
export const useCanReviewProduct = (productId: string | undefined) => {
  return useQuery({
    queryKey: ['can-review-product', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isAuthenticated: false, hasPurchased: false, hasReviewed: false };
      }

      const [purchaseRes, reviewRes] = await Promise.all([
        supabase
          .from('order_items')
          .select('id, orders!inner(user_id, status)')
          .eq('product_id', productId!)
          .eq('orders.user_id', user.id)
          .in('orders.status', ['delivered', 'confirmed'])
          .limit(1),
        supabase
          .from('reviews')
          .select('id')
          .eq('product_id', productId!)
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      return {
        isAuthenticated: true,
        hasPurchased: (purchaseRes.data?.length ?? 0) > 0,
        hasReviewed: !!reviewRes.data,
      };
    },
  });
};
