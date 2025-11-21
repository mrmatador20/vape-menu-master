import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Banner {
  id: string;
  title: string;
  description: string | null;
  background_color: string;
  text_color: string;
  background_image_url: string | null;
  full_banner_image_url: string | null;
  is_active: boolean;
  display_order: number;
  rotation_seconds: number;
  transition_type: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string;
  updated_at: string;
}

export const useBanners = () => {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Banner[];
    },
  });
};

export const useActiveBanners = () => {
  return useQuery({
    queryKey: ['active-banners'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      // Filter banners based on scheduling
      const filteredData = (data as Banner[]).filter(banner => {
        // If no scheduling is set, show the banner
        if (!banner.scheduled_start && !banner.scheduled_end) return true;
        
        // If only start date is set, show if current time is after start
        if (banner.scheduled_start && !banner.scheduled_end) {
          return now >= banner.scheduled_start;
        }
        
        // If only end date is set, show if current time is before end
        if (!banner.scheduled_start && banner.scheduled_end) {
          return now <= banner.scheduled_end;
        }
        
        // If both are set, show if current time is within range
        return now >= banner.scheduled_start! && now <= banner.scheduled_end!;
      });
      
      return filteredData;
    },
  });
};

export const useCreateBanner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('banners')
        .insert(banner)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      queryClient.invalidateQueries({ queryKey: ['active-banners'] });
      toast.success('Banner criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar banner: ' + error.message);
    },
  });
};

export const useUpdateBanner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...banner }: Partial<Banner> & { id: string }) => {
      const { data, error } = await supabase
        .from('banners')
        .update(banner)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      queryClient.invalidateQueries({ queryKey: ['active-banners'] });
      toast.success('Banner atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar banner: ' + error.message);
    },
  });
};

export const useDeleteBanner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      queryClient.invalidateQueries({ queryKey: ['active-banners'] });
      toast.success('Banner deletado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao deletar banner: ' + error.message);
    },
  });
};
