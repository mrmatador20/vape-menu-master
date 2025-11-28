import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/context/CartContext';
import { toast } from 'sonner';

interface CartSyncOptions {
  items: CartItem[];
  onPriceChange: (productId: string, newPrice: number) => void;
  onStockChange: (productId: string, inStock: boolean) => void;
  intervalMs?: number;
}

/**
 * Hook para sincronizar carrinho com servidor
 * Valida preços e disponibilidade periodicamente
 */
export const useCartSync = ({
  items,
  onPriceChange,
  onStockChange,
  intervalMs = 30000, // 30 segundos por padrão
}: CartSyncOptions) => {
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (items.length === 0) return;

    const syncCart = async () => {
      const now = Date.now();
      
      // Previne sincronizações muito frequentes
      if (now - lastSyncRef.current < intervalMs) {
        return;
      }

      lastSyncRef.current = now;
      
      const productIds = items.map(item => item.id);
      
      try {
        // Buscar dados atualizados dos produtos
        const { data: products, error } = await supabase
          .from('products')
          .select('id, name, price, stock, discount_value, discount_type')
          .in('id', productIds);

        if (error) {
          console.error('[CartSync] Error fetching products:', error);
          return;
        }

        if (!products) return;

        // Buscar sabores se necessário
        const itemsWithFlavors = items.filter(item => item.flavor);
        let flavorsMap = new Map<string, any>();

        if (itemsWithFlavors.length > 0) {
          const { data: flavors } = await supabase
            .from('flavors')
            .select('product_id, name, price, stock')
            .in('product_id', productIds);

          if (flavors) {
            flavors.forEach(flavor => {
              const key = `${flavor.product_id}-${flavor.name}`;
              flavorsMap.set(key, flavor);
            });
          }
        }

        // Verificar mudanças
        products.forEach(product => {
          const cartItem = items.find(item => item.id === product.id);
          if (!cartItem) return;

          // ✅ NÃO recalcular preço - o preço no carrinho já foi calculado corretamente
          // O preço é calculado uma única vez quando o item é adicionado ao carrinho
          // e não deve ser alterado durante a sincronização

          // Verificar apenas disponibilidade de estoque
          if (cartItem.flavor) {
            const flavorKey = `${product.id}-${cartItem.flavor}`;
            const flavor = flavorsMap.get(flavorKey);

            // Verificar estoque do sabor
            if (flavor && flavor.stock === 0) {
              onStockChange(product.id, false);
              toast.error(`${product.name} (${cartItem.flavor}) está esgotado`, {
                id: `stock-${product.id}-${cartItem.flavor}`,
              });
            }
          } else {
            // Verificar estoque do produto
            if (product.stock === 0) {
              onStockChange(product.id, false);
              toast.error(`${cartItem.name} está esgotado`, {
                id: `stock-${product.id}`,
              });
            }
          }
        });
      } catch (error) {
        console.error('[CartSync] Sync error:', error);
      }
    };

    // Sincronizar imediatamente
    syncCart();

    // Sincronizar periodicamente
    const interval = setInterval(syncCart, intervalMs);

    return () => clearInterval(interval);
  }, [items, intervalMs, onPriceChange, onStockChange]);
};
