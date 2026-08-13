import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_RULES, InstallmentRules } from '@/lib/installments';
import { logActivity } from '@/hooks/useActivityLogs';

export interface PaymentSettings {
  id: string;
  max_interest_free_installments: number;
  max_total_installments: number;
  monthly_interest_rate: number;
  updated_at: string;
}

export const usePaymentSettings = () => {
  return useQuery({
    queryKey: ['payment-settings'],
    queryFn: async (): Promise<PaymentSettings | null> => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PaymentSettings | null;
    },
    staleTime: 60_000,
  });
};

export const useInstallmentRules = (): { rules: InstallmentRules; isLoading: boolean } => {
  const { data, isLoading } = usePaymentSettings();
  if (!data) return { rules: DEFAULT_RULES, isLoading };
  return {
    isLoading,
    rules: {
      maxInterestFree: data.max_interest_free_installments,
      maxTotal: data.max_total_installments,
      monthlyRate: Number(data.monthly_interest_rate) / 100,
    },
  };
};

export const useUpdatePaymentSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      current,
      values,
    }: {
      current: PaymentSettings | null;
      values: Pick<
        PaymentSettings,
        'max_interest_free_installments' | 'max_total_installments' | 'monthly_interest_rate'
      >;
    }) => {
      let saved: PaymentSettings;
      if (current) {
        const { data, error } = await supabase
          .from('payment_settings')
          .update(values)
          .eq('id', current.id)
          .select()
          .single();
        if (error) throw error;
        saved = data as PaymentSettings;
      } else {
        const { data, error } = await supabase
          .from('payment_settings')
          .insert(values)
          .select()
          .single();
        if (error) throw error;
        saved = data as PaymentSettings;
      }

      await logActivity('admin_settings_changed', {
        severity: 'warning',
        resourceType: 'payment_settings',
        resourceId: saved.id,
        beforeData: current ?? null,
        afterData: saved,
        metadata: { area: 'parcelamento_cartao' },
      });

      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-settings'] });
    },
  });
};
