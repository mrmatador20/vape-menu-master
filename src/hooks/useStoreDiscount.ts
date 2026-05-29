import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoreDiscount {
  active: boolean;
  type: 'percent' | 'fixed';
  value: number;
}

export const fetchStoreDiscount = async (): Promise<StoreDiscount> => {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['store_discount_active', 'store_discount_type', 'store_discount_value']);

  if (error) {
    console.warn('[useStoreDiscount]', error.message);
    return { active: false, type: 'percent', value: 0 };
  }

  const map = new Map((data || []).map(r => [r.key, r.value]));
  return {
    active: (map.get('store_discount_active') || 'false') === 'true',
    type: (map.get('store_discount_type') as 'percent' | 'fixed') || 'percent',
    value: Number(map.get('store_discount_value') || '0') || 0,
  };
};

export const useStoreDiscount = () => {
  return useQuery({
    queryKey: ['store-discount'],
    queryFn: fetchStoreDiscount,
    staleTime: 60_000,
  });
};

/**
 * Resolves the effective discount for a product.
 * Per-product discount overrides the store-wide discount.
 */
export const resolveEffectiveDiscount = (
  productDiscountValue: number | undefined | null,
  productDiscountType: 'percent' | 'fixed' | undefined | null,
  storeDiscount: StoreDiscount | undefined | null,
): { value: number; type: 'percent' | 'fixed' } => {
  if (productDiscountValue && productDiscountValue > 0) {
    return {
      value: productDiscountValue,
      type: (productDiscountType as 'percent' | 'fixed') || 'percent',
    };
  }
  if (storeDiscount?.active && storeDiscount.value > 0) {
    return { value: storeDiscount.value, type: storeDiscount.type };
  }
  return { value: 0, type: 'percent' };
};
