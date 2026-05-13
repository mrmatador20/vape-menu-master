import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description?: string;
  path?: string;
}

/**
 * Sets per-route <title>, meta description, og:title/description/url and canonical.
 * Restores nothing on unmount — SiteIdentityProvider re-applies defaults on home.
 */
export const usePageMeta = ({ title, description, path }: PageMetaOptions) => {
  useEffect(() => {
    document.title = title;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        const [, name] = selector.match(/\[(?:name|property)="([^"]+)"\]/) ?? [];
        if (selector.includes('property=')) el.setAttribute('property', name);
        else el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
      setMeta('meta[name="twitter:description"]', 'content', description);
    }
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[name="twitter:title"]', 'content', title);

    const url = `https://foxvelour.com${path ?? window.location.pathname}`;
    setMeta('meta[property="og:url"]', 'content', url);

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  }, [title, description, path]);
};
