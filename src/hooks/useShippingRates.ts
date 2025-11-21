import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShippingRate {
  id: string;
  cep: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export const useShippingRates = () => {
  return useQuery({
    queryKey: ['shipping-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('*')
        .order('cep');
      
      if (error) throw error;
      return data as ShippingRate[];
    },
  });
};

export const useShippingRateByCep = (cep: string) => {
  return useQuery({
    queryKey: ['shipping-rate', cep],
    queryFn: async () => {
      if (!cep) return null;
      
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('*')
        .eq('cep', cep)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as ShippingRate | null;
    },
    enabled: !!cep,
  });
};

export const useAddShippingRate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { cep: string; price: number }) => {
      const { error } = await supabase
        .from('shipping_rates')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      toast.success('Taxa de entrega adicionada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar taxa: ${error.message}`);
    },
  });
};

export const useUpdateShippingRate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { cep: string; price: number } }) => {
      const { error } = await supabase
        .from('shipping_rates')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      toast.success('Taxa de entrega atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar taxa: ${error.message}`);
    },
  });
};

export const useDeleteShippingRate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shipping_rates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      toast.success('Taxa de entrega removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover taxa: ${error.message}`);
    },
  });
};
