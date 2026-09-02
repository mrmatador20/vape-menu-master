import { Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LogRetentionSettings from '@/components/admin/LogRetentionSettings';
import SiteIdentitySettings from '@/components/admin/SiteIdentitySettings';


import FooterSettings from '@/components/admin/FooterSettings';
import SiteThemeSettings from '@/components/admin/SiteThemeSettings';
import CategoriesSettings from '@/components/admin/CategoriesSettings';
import PaymentSettingsCard from '@/components/admin/PaymentSettingsCard';
import BalcaoPixFallbackSettings from '@/components/admin/BalcaoPixFallbackSettings';
import TelegramNotificationSettings from '@/components/admin/TelegramNotificationSettings';

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

      <Tabs defaultValue="identidade" className="w-full">
        <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1">
          <TabsTrigger value="identidade">Identidade da Loja</TabsTrigger>
          <TabsTrigger value="rodape">Rodapé &amp; LGPD</TabsTrigger>
          <TabsTrigger value="pix">Pix Balcão &amp; Dados</TabsTrigger>
          <TabsTrigger value="sistema">Segurança &amp; Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="mt-6 space-y-6">
          <SiteIdentitySettings />
          
          <SiteThemeSettings />
        </TabsContent>


        <TabsContent value="rodape" className="mt-6 space-y-6">
          <FooterSettings />
        </TabsContent>

        <TabsContent value="pix" className="mt-6 space-y-6">
          <BalcaoPixFallbackSettings />
          <PaymentSettingsCard />
        </TabsContent>

        <TabsContent value="sistema" className="mt-6 space-y-6">
          <TelegramNotificationSettings />
          <CategoriesSettings />
          <LogRetentionSettings />
          <div className="text-center py-6 text-muted-foreground border-t">
            <p className="text-sm">
              Configure o frete grátis por CEP na página de Taxas de Entrega.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

