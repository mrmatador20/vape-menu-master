import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import HeroBannerSettings from '@/components/admin/HeroBannerSettings';

export default function WelcomeCarousel() {
  const { data: role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== 'admin' && (role as string) !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Carrossel Boas-Vindas</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as imagens, textos, opacidade, ordem e status do carrossel "Bem-vindo à Fox Velour" da página inicial.
        </p>
      </div>

      <HeroBannerSettings />
    </div>
  );
}
