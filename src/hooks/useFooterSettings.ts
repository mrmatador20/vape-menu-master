import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FooterSettings {
  id?: string;
  brand_description: string;
  contact_email: string;
  contact_phone: string;
  legal_controller_name: string;
  legal_city_state: string;
  copyright_year: string;
  custom_copyright_text: string;
}

export const FOOTER_DEFAULTS: FooterSettings = {
  brand_description: '',
  contact_email: '',
  contact_phone: '',
  legal_controller_name: '',
  legal_city_state: '',
  copyright_year: '',
  custom_copyright_text: '',
};

export const useFooterSettings = () => {
  return useQuery({
    queryKey: ['footer-settings'],
    queryFn: async (): Promise<FooterSettings> => {
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { ...FOOTER_DEFAULTS };

      return {
        id: data.id,
        brand_description: data.brand_description ?? '',
        contact_email: data.contact_email ?? '',
        contact_phone: data.contact_phone ?? '',
        legal_controller_name: data.legal_controller_name ?? '',
        legal_city_state: data.legal_city_state ?? '',
        copyright_year: data.copyright_year ?? '',
        custom_copyright_text: data.custom_copyright_text ?? '',
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};
