import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FooterSettings {
  site_footer_brand_description: string;
  site_footer_contact_email: string;
  site_footer_contact_phone: string;
  site_footer_legal_controller: string;
  site_footer_legal_city_state: string;
  site_footer_copyright_year: string;
  site_footer_custom_copyright: string;
}

export const FOOTER_DEFAULTS: FooterSettings = {
  site_footer_brand_description: 'Loja online de produtos selecionados.',
  site_footer_contact_email: 'foxvelour@gmail.com',
  site_footer_contact_phone: '',
  site_footer_legal_controller: 'Matheus Herminio Costa Cardoso',
  site_footer_legal_city_state: 'Cuité/PB',
  site_footer_copyright_year: String(new Date().getFullYear()),
  site_footer_custom_copyright: '',
};

export const FOOTER_SETTINGS_KEYS = Object.keys(FOOTER_DEFAULTS) as (keyof FooterSettings)[];

export const useFooterSettings = () => {
  return useQuery({
    queryKey: ['footer-settings'],
    queryFn: async (): Promise<FooterSettings> => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', FOOTER_SETTINGS_KEYS as string[]);

      if (error) throw error;

      const result = { ...FOOTER_DEFAULTS };
      (data ?? []).forEach((row: { key: string; value: string }) => {
        if (row.key in result) (result as any)[row.key] = row.value;
      });
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
};
