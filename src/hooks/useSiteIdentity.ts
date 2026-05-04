import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteIdentity {
  site_name: string;
  site_tagline: string;
  site_description: string;
  site_pwa_short_name: string;
  site_footer_text: string;
  site_browser_title: string;
}

const DEFAULTS: SiteIdentity = {
  site_name: 'NebulaVape',
  site_tagline: 'Sua loja de vapes de confiança',
  site_description: 'Loja online de vapers, com entrega rápida. Diversos sabores disponíveis.',
  site_pwa_short_name: 'NebulaVape',
  site_footer_text: '© NebulaVape - Todos os direitos reservados',
  site_browser_title: 'NebulaVape - Venda de Vapers',
};

export const SITE_IDENTITY_KEYS = Object.keys(DEFAULTS) as (keyof SiteIdentity)[];

export const useSiteIdentity = () => {
  return useQuery({
    queryKey: ['site-identity'],
    queryFn: async (): Promise<SiteIdentity> => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', SITE_IDENTITY_KEYS as string[]);

      if (error) throw error;

      const result = { ...DEFAULTS };
      (data ?? []).forEach((row: { key: string; value: string }) => {
        if (row.key in result) {
          (result as any)[row.key] = row.value;
        }
      });
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
};
