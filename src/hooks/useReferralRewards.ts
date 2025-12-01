import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReferralReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  discount_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useReferralRewards = () => {
  return useQuery({
    queryKey: ['referral-rewards'],
    queryFn: async (): Promise<ReferralReward[]> => {
      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useAllReferralRewards = () => {
  return useQuery({
    queryKey: ['all-referral-rewards'],
    queryFn: async (): Promise<ReferralReward[]> => {
      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useAddReferralReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reward: Omit<ReferralReward, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('referral_rewards')
        .insert(reward)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-referral-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['referral-rewards'] });
      toast.success('Recompensa criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar recompensa');
    },
  });
};

export const useUpdateReferralReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReferralReward> & { id: string }) => {
      const { data, error } = await supabase
        .from('referral_rewards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-referral-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['referral-rewards'] });
      toast.success('Recompensa atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar recompensa');
    },
  });
};

export const useDeleteReferralReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('referral_rewards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-referral-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['referral-rewards'] });
      toast.success('Recompensa excluída com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir recompensa');
    },
  });
};

export const useRedeemReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Get reward details
      const { data: reward, error: rewardError } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('id', rewardId)
        .single();

      if (rewardError) throw rewardError;

      // Get current points
      const { data: points, error: pointsError } = await supabase
        .from('referral_points')
        .select('points_balance, total_redeemed')
        .eq('user_id', user.id)
        .single();

      if (pointsError) throw pointsError;

      // Check if user has enough points
      if (points.points_balance < reward.points_required) {
        throw new Error('Pontos insuficientes para resgatar esta recompensa');
      }

      // Generate unique coupon code
      const { data: couponCode, error: codeError } = await supabase
        .rpc('generate_unique_coupon_code');

      if (codeError) throw codeError;

      // Get coupon configuration from settings
      const [typeResult, valueResult, validityResult] = await Promise.all([
        supabase.from('settings').select('value').eq('key', 'referral_coupon_type').maybeSingle(),
        supabase.from('settings').select('value').eq('key', 'referral_coupon_value').maybeSingle(),
        supabase.from('settings').select('value').eq('key', 'referral_coupon_validity_days').maybeSingle(),
      ]);

      const couponType = typeResult.data?.value || 'percent';
      const couponValue = parseFloat(valueResult.data?.value || '10');
      const validityDays = parseInt(validityResult.data?.value || '30');

      // Create unique discount coupon for this user
      const { data: newCoupon, error: couponError } = await supabase
        .from('discounts')
        .insert({
          code: couponCode,
          type: couponType as 'percent' | 'fixed',
          value: couponValue,
          schedule_type: 'permanent',
          is_active: true,
          max_uses: 1, // Single use
          user_id: user.id,
          is_referral_reward: true,
          reward_id: rewardId,
          valid_until: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (couponError) throw couponError;

      // Deduct points
      const { error: updateError } = await supabase
        .from('referral_points')
        .update({
          points_balance: points.points_balance - reward.points_required,
          total_redeemed: points.total_redeemed + reward.points_required,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('referral_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'redeemed',
          points_amount: -reward.points_required,
          reward_id: rewardId,
          notes: `Resgatou: ${reward.name} - Cupom: ${couponCode}`,
        });

      if (transactionError) throw transactionError;

      return { reward, discountCode: newCoupon.code };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['referral-points'] });
      queryClient.invalidateQueries({ queryKey: ['referral-transactions'] });
      
      if (data.discountCode) {
        toast.success(`Recompensa resgatada! Seu cupom: ${data.discountCode}`);
      } else {
        toast.success('Recompensa resgatada com sucesso!');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao resgatar recompensa');
    },
  });
};