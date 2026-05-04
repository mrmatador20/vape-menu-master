import { useEffect } from 'react';
import { useSiteTheme } from '@/hooks/useSiteTheme';

const VAR_MAP: Record<string, string> = {
  theme_primary: '--primary',
  theme_background: '--background',
  theme_foreground: '--foreground',
  theme_card: '--card',
  theme_card_foreground: '--card-foreground',
  theme_accent: '--accent',
  theme_border: '--border',
};

/**
 * Aplica o tema (cores HSL) escolhido pelo admin diretamente nas
 * variáveis CSS do design system, em tempo real.
 */
export const SiteThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: theme } = useSiteTheme();

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;

    Object.entries(VAR_MAP).forEach(([settingKey, cssVar]) => {
      const value = (theme as any)[settingKey];
      if (value) root.style.setProperty(cssVar, value);
    });

    // Tokens derivados para manter consistência com o design system
    root.style.setProperty('--popover', theme.theme_card);
    root.style.setProperty('--popover-foreground', theme.theme_card_foreground);
    root.style.setProperty('--input', theme.theme_border);
    root.style.setProperty('--ring', theme.theme_primary);
    root.style.setProperty('--primary-foreground', theme.theme_background);
    root.style.setProperty('--accent-foreground', theme.theme_background);
    root.style.setProperty(
      '--gradient-primary',
      `linear-gradient(135deg, hsl(${theme.theme_primary}), hsl(${theme.theme_accent}))`
    );
  }, [theme]);

  return <>{children}</>;
};
