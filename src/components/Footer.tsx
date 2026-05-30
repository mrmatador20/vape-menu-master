import { Link } from 'react-router-dom';
import { Mail, Shield } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t bg-background mt-12">
      <div className="container mx-auto px-4 py-8 grid gap-6 md:grid-cols-3 text-sm">
        <div>
          <h3 className="font-semibold mb-2">Fox Velour</h3>
          <p className="text-muted-foreground">Loja online de produtos selecionados.</p>
          <p className="text-muted-foreground mt-2 flex items-center gap-1">
            <Mail className="h-3 w-3" /> foxvelour@gmail.com
          </p>
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
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Fox Velour. Controlador: Matheus Herminio Costa Cardoso · Cuité/PB · Em conformidade com a LGPD (Lei 13.709/2018).
      </div>
    </footer>
  );
};

export default Footer;
