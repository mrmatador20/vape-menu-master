import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BannerPosition = 'top' | 'home_promo';

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
  position: BannerPosition;
  eyebrow: string | null;
  cta_label: string | null;
  cta_href: string | null;
  height_vh: number;
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
      return data as unknown as Banner[];
    },
  });
};

const filterScheduled = (banners: Banner[]) => {
  const now = new Date().toISOString();
  return banners.filter(banner => {
    if (!banner.scheduled_start && !banner.scheduled_end) return true;
    if (banner.scheduled_start && !banner.scheduled_end) return now >= banner.scheduled_start;
    if (!banner.scheduled_start && banner.scheduled_end) return now <= banner.scheduled_end;
    return now >= banner.scheduled_start! && now <= banner.scheduled_end!;
  });
};

export const useActiveBanners = (position: BannerPosition = 'top') => {
  return useQuery({
    queryKey: ['active-banners', position],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .eq('position', position)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return filterScheduled(data as unknown as Banner[]);
    },
  });
};

export const useActivePromoBanner = () => {
  const query = useActiveBanners('home_promo');
  return { ...query, data: query.data?.[0] ?? null };
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
