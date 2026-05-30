import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'cookie_consent_v1';
const ANON_KEY = 'anon_consent_id';

const getAnonId = (): string => {
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
};

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = async () => {
    const ts = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, granted_at: ts, version: '1.0' }));
    setVisible(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('user_consents').insert({
        user_id: user?.id ?? null,
        anonymous_id: user?.id ? null : getAnonId(),
        consent_type: 'cookies_essential',
        consent_version: '1.0',
        granted: true,
        user_agent: navigator.userAgent.slice(0, 500),
      });
    } catch (e) {
      console.warn('Falha ao registrar consentimento de cookies', e);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur p-4 shadow-lg"
    >
      <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center gap-3">
        <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm text-muted-foreground flex-1">
          Usamos apenas <strong>cookies essenciais</strong> para autenticar você, manter o carrinho e
          garantir a segurança do site. Não usamos cookies de analytics ou marketing. Saiba mais em
          nossa{' '}
          <Link to="/privacy-policy" className="underline font-medium">Política de Privacidade</Link>.
        </p>
        <Button onClick={accept} size="sm" className="shrink-0">Entendi</Button>
      </div>
    </div>
  );
};

export default CookieBanner;
