import { useEffect } from 'react';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';

/**
 * Aplica a identidade do site (título da aba, meta description, manifest PWA)
 * dinamicamente a partir das configurações salvas no admin.
 */
export const SiteIdentityProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: identity } = useSiteIdentity();

  useEffect(() => {
    if (!identity) return;

    // <title>
    document.title = identity.site_browser_title || identity.site_name;

    // meta description
    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (el) el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', 'content', identity.site_description);
    setMeta('meta[name="author"]', 'content', identity.site_name);
    setMeta('meta[property="og:title"]', 'content', identity.site_browser_title);
    setMeta('meta[name="twitter:title"]', 'content', identity.site_browser_title);
    setMeta('meta[property="og:description"]', 'content', identity.site_description);
    setMeta('meta[name="twitter:description"]', 'content', identity.site_description);

    // PWA manifest (atualiza dinamicamente via blob)
    try {
      const manifest = {
        name: identity.site_name,
        short_name: identity.site_pwa_short_name,
        description: identity.site_tagline,
        start_url: '/',
        display: 'standalone',
        background_color: '#0f1419',
        theme_color: '#00ccff',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
        ],
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (link) link.href = url;
    } catch {
      // ignore
    }
  }, [identity]);

  return <>{children}</>;
};
