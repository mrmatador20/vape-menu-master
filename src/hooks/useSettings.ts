import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key');
      
      if (error) throw error;
      return data as Setting[];
    },
  });
};

export const useSettingByKey = (key: string) => {
  return useQuery({
    queryKey: ['setting', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', key)
        .maybeSingle();
      
      if (error) throw error;
      return data as Setting | null;
    },
    enabled: !!key,
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      // Try to update first
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        // Update existing setting
        const { error } = await supabase
          .from('settings')
          .update({ value })
          .eq('key', key);
        
        if (error) throw error;
      } else {
        // Insert new setting
        const { error } = await supabase
          .from('settings')
          .insert({ key, value, description: description || '' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['setting'] });
      toast.success('Configuração atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar configuração: ${error.message}`);
    },
  });
};
