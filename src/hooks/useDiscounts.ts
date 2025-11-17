import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Discount {
  id: string;
  code: string;
  value: number;
  type: 'percent' | 'fixed';
  schedule_type: 'permanent' | 'hourly' | 'daily';
  start_time?: string;
  end_time?: string;
  day_of_week?: number;
  is_active: boolean;
  valid_until?: string;
}

const isDiscountActive = (discount: Discount): boolean => {
  if (!discount.is_active) return false;
  
  const now = new Date();
  
  // Check expiration
  if (discount.valid_until && new Date(discount.valid_until) < now) {
    return false;
  }
  
  // Permanent discounts
  if (discount.schedule_type === 'permanent') {
    return true;
  }
  
  // Hourly discounts
  if (discount.schedule_type === 'hourly' && discount.start_time && discount.end_time) {
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= discount.start_time && currentTime <= discount.end_time;
  }
  
  // Daily discounts
  if (discount.schedule_type === 'daily' && discount.day_of_week !== undefined) {
    return now.getDay() === discount.day_of_week;
  }
  
  return false;
};

export const useDiscounts = () => {
  return useQuery({
    queryKey: ['discounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Filter active discounts based on schedule
      return (data as Discount[]).filter(isDiscountActive);
    },
    refetchInterval: 60000, // Refetch every minute to update time-based discounts
  });
};

export const calculateDiscountedPrice = (originalPrice: number, discounts: Discount[]): number => {
  if (!discounts || discounts.length === 0) return originalPrice;
  
  // Apply the best discount
  let bestPrice = originalPrice;
  
  discounts.forEach(discount => {
    let discountedPrice = originalPrice;
    
    if (discount.type === 'percent') {
      discountedPrice = originalPrice * (1 - discount.value / 100);
    } else {
      discountedPrice = originalPrice - discount.value;
    }
    
    if (discountedPrice < bestPrice) {
      bestPrice = discountedPrice;
    }
  });
  
  return Math.max(0, bestPrice);
};