import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeroBanner {
  id: string;
  image_url: string;
  opacity: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  title: string | null;
  subtitle: string | null;
  show_text_overlay: boolean;
}

export function useActiveHeroBanners() {
  return useQuery({
    queryKey: ['home-hero-banners', 'active'],
    queryFn: async (): Promise<HeroBanner[]> => {
      const { data, error } = await supabase
        .from('home_hero_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as HeroBanner[];
    },
  });
}

export function useAllHeroBanners() {
  return useQuery({
    queryKey: ['home-hero-banners', 'all'],
    queryFn: async (): Promise<HeroBanner[]> => {
      const { data, error } = await supabase
        .from('home_hero_banners')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as HeroBanner[];
    },
  });
}
