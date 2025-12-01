import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReferralPoints {
  id: string;
  user_id: string;
  points_balance: number;
  total_earned: number;
  total_redeemed: number;
  created_at: string;
  updated_at: string;
}

export interface ReferralTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earned' | 'redeemed' | 'adjusted' | 'revoked';
  points_amount: number;
  related_user_id: string | null;
  related_order_id: string | null;
  reward_id: string | null;
  notes: string | null;
  created_at: string;
}

export const useReferralPoints = () => {
  return useQuery({
    queryKey: ['referral-points'],
    queryFn: async (): Promise<ReferralPoints | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('referral_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
};

export const useReferralTransactions = () => {
  return useQuery({
    queryKey: ['referral-transactions'],
    queryFn: async (): Promise<ReferralTransaction[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('referral_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ReferralTransaction[];
    },
  });
};

export const useAllReferralPoints = () => {
  return useQuery({
    queryKey: ['all-referral-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_points')
        .select(`
          *,
          profiles:user_id (
            full_name,
            referral_code
          )
        `)
        .order('points_balance', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useAdjustPoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      pointsAmount, 
      notes 
    }: { 
      userId: string; 
      pointsAmount: number; 
      notes: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Get current points
      const { data: currentPoints, error: fetchError } = await supabase
        .from('referral_points')
        .select('points_balance, total_earned, total_redeemed')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const newBalance = currentPoints.points_balance + pointsAmount;
      if (newBalance < 0) {
        throw new Error('Saldo de pontos insuficiente');
      }

      // Update points balance
      const { error: updateError } = await supabase
        .from('referral_points')
        .update({
          points_balance: newBalance,
          total_earned: pointsAmount > 0 ? currentPoints.total_earned + pointsAmount : currentPoints.total_earned,
          total_redeemed: pointsAmount < 0 ? currentPoints.total_redeemed + Math.abs(pointsAmount) : currentPoints.total_redeemed,
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('referral_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'adjusted',
          points_amount: pointsAmount,
          notes,
        });

      if (transactionError) throw transactionError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-referral-points'] });
      toast.success('Pontos ajustados com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao ajustar pontos');
    },
  });
};

export const useValidateReferralCode = () => {
  return useMutation({
    mutationFn: async (referralCode: string) => {
      if (!referralCode || referralCode.trim() === '') {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code')
        .eq('referral_code', referralCode.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
};