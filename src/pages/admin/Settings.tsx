import { Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import LogRetentionSettings from '@/components/admin/LogRetentionSettings';
import SiteIdentitySettings from '@/components/admin/SiteIdentitySettings';
import SiteThemeSettings from '@/components/admin/SiteThemeSettings';
import CategoriesSettings from '@/components/admin/CategoriesSettings';
import PaymentSettingsCard from '@/components/admin/PaymentSettingsCard';
import PixBalcaoSettingsCard from '@/components/admin/PixBalcaoSettingsCard';


export default function Settings() {
  const { data: role, isLoading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
        <p className="text-muted-foreground mt-1">
          Configure as opções gerais da loja e segurança
        </p>
      </div>

      <SiteIdentitySettings />

      <SiteThemeSettings />

      <CategoriesSettings />

      <PaymentSettingsCard />

      <PixBalcaoSettingsCard />


      <LogRetentionSettings />

      <div className="text-center py-6 text-muted-foreground border-t">
        <p className="text-sm">
          Configure o frete grátis por CEP na página de Taxas de Entrega.
        </p>
      </div>
    </div>
  );
}
