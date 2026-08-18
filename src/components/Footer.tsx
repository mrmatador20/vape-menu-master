import { Link } from 'react-router-dom';
import { Mail, Phone, Shield } from 'lucide-react';
import { useFooterSettings, FOOTER_DEFAULTS } from '@/hooks/useFooterSettings';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';

const Footer = () => {
  const { data } = useFooterSettings();
  const { data: identity } = useSiteIdentity();
  const f = data ?? FOOTER_DEFAULTS;
  const storeName = identity?.site_name || 'Fox Velour';
  const year = f.copyright_year || String(new Date().getFullYear());
  const legalParts = [
    `© ${year} ${storeName}.`,
    f.legal_controller_name ? `Controlador: ${f.legal_controller_name}` : '',
    f.legal_city_state,
    'Em conformidade com a LGPD (Lei 13.709/2018).',
  ].filter(Boolean);
  const legalLine = f.custom_copyright_text || legalParts.join(' · ');

  return (
    <footer className="border-t bg-background mt-12">
      <div className="container mx-auto px-4 py-8 grid gap-6 md:grid-cols-3 text-sm">
        <div>
          <h3 className="font-semibold mb-2">{storeName}</h3>
          {f.brand_description && <p className="text-muted-foreground">{f.brand_description}</p>}
          {f.contact_email && (
            <p className="text-muted-foreground mt-2 flex items-center gap-1">
              <Mail className="h-3 w-3" /> {f.contact_email}
            </p>
          )}
          {f.contact_phone && (
            <p className="text-muted-foreground mt-1 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {f.contact_phone}
            </p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Privacidade e Termos</h3>
          <ul className="space-y-1">
            <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground">Política de Privacidade</Link></li>
            <li><Link to="/terms-of-use" className="text-muted-foreground hover:text-foreground">Termos de Uso</Link></li>
            <li><Link to="/data-rights" className="text-muted-foreground hover:text-foreground flex items-center gap-1"><Shield className="h-3 w-3" />Direitos do Titular (LGPD)</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Conta</h3>
          <ul className="space-y-1">
            <li><Link to="/profile" className="text-muted-foreground hover:text-foreground">Meu Perfil</Link></li>
            <li><Link to="/my-orders" className="text-muted-foreground hover:text-foreground">Meus Pedidos</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground px-4">
        {legalLine}
      </div>
    </footer>
  );
};

export default Footer;
