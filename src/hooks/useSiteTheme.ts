import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteTheme {
  theme_preset: string;
  theme_primary: string;
  theme_background: string;
  theme_foreground: string;
  theme_card: string;
  theme_card_foreground: string;
  theme_accent: string;
  theme_border: string;
}

export const THEME_DEFAULTS: SiteTheme = {
  theme_preset: 'ivory-gold',
  theme_primary: '38 55% 52%',
  theme_background: '40 30% 97%',
  theme_foreground: '30 15% 15%',
  theme_card: '0 0% 100%',
  theme_card_foreground: '30 15% 15%',
  theme_accent: '38 65% 58%',
  theme_border: '38 25% 88%',
};

export const THEME_KEYS = Object.keys(THEME_DEFAULTS) as (keyof SiteTheme)[];

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  values: Omit<SiteTheme, 'theme_preset'>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'dark',
    name: 'Escuro Neon (padrão)',
    description: 'Fundo escuro com destaques em ciano',
    values: {
      theme_primary: '195 100% 50%',
      theme_background: '220 25% 8%',
      theme_foreground: '180 100% 95%',
      theme_card: '220 20% 12%',
      theme_card_foreground: '180 100% 95%',
      theme_accent: '195 100% 60%',
      theme_border: '220 15% 22%',
    },
  },
  {
    id: 'light',
    name: 'Claro / Branco',
    description: 'Fundo branco, texto escuro, destaque em azul',
    values: {
      theme_primary: '210 90% 50%',
      theme_background: '0 0% 100%',
      theme_foreground: '220 25% 12%',
      theme_card: '0 0% 100%',
      theme_card_foreground: '220 25% 12%',
      theme_accent: '210 90% 55%',
      theme_border: '220 15% 88%',
    },
  },
  {
    id: 'purple',
    name: 'Roxo Premium',
    description: 'Fundo escuro com destaque em roxo',
    values: {
      theme_primary: '270 80% 60%',
      theme_background: '260 25% 10%',
      theme_foreground: '270 30% 95%',
      theme_card: '260 20% 14%',
      theme_card_foreground: '270 30% 95%',
      theme_accent: '290 80% 65%',
      theme_border: '260 15% 25%',
    },
  },
  {
    id: 'green',
    name: 'Verde Natureza',
    description: 'Fundo claro com destaque em verde',
    values: {
      theme_primary: '150 65% 40%',
      theme_background: '60 20% 98%',
      theme_foreground: '150 30% 12%',
      theme_card: '0 0% 100%',
      theme_card_foreground: '150 30% 12%',
      theme_accent: '150 65% 45%',
      theme_border: '150 15% 85%',
    },
  },
];

export const useSiteTheme = () => {
  return useQuery({
    queryKey: ['site-theme'],
    queryFn: async (): Promise<SiteTheme> => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', THEME_KEYS as string[]);
      if (error) throw error;

      const result = { ...THEME_DEFAULTS };
      (data ?? []).forEach((row: { key: string; value: string }) => {
        if (row.key in result) (result as any)[row.key] = row.value;
      });
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
};
