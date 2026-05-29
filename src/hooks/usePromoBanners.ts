import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PromoBanner {
  id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  eyebrow: string | null;
  image_url: string;
  mobile_image_url: string | null;
  button_label: string | null;
  button_link: string | null;
  coupon_code: string | null;
  is_active: boolean;
  display_order: number;
  rotation_seconds: number;
  overlay_opacity: number;
  text_align: 'left' | 'center' | 'right';
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string;
  updated_at: string;
}

export const usePromoBanners = () => {
  return useQuery({
    queryKey: ['promo-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as PromoBanner[];
    },
  });
};

export const useActivePromoBanners = () => {
  return useQuery({
    queryKey: ['active-promo-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      const now = new Date().toISOString();
      return (data as PromoBanner[]).filter((b) => {
        if (b.scheduled_start && b.scheduled_start > now) return false;
        if (b.scheduled_end && b.scheduled_end < now) return false;
        return true;
      });
    },
  });
};

export const useCreatePromoBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (banner: Omit<PromoBanner, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('promo_banners').insert(banner).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-banners'] });
      qc.invalidateQueries({ queryKey: ['active-promo-banners'] });
      toast.success('Banner promocional criado!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
};

export const useUpdatePromoBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...banner }: Partial<PromoBanner> & { id: string }) => {
      const { data, error } = await supabase.from('promo_banners').update(banner).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-banners'] });
      qc.invalidateQueries({ queryKey: ['active-promo-banners'] });
      toast.success('Banner atualizado!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
};

export const useDeletePromoBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promo_banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-banners'] });
      qc.invalidateQueries({ queryKey: ['active-promo-banners'] });
      toast.success('Banner deletado!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
};
