import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useBanners, useDeleteBanner, useUpdateBanner } from '@/hooks/useBanners';
import { BannerFormDialog } from '@/components/admin/BannerFormDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Banners() {
  const { data: banners, isLoading } = useBanners();
  const deleteBanner = useDeleteBanner();
  const updateBanner = useUpdateBanner();

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await updateBanner.mutateAsync({ id, is_active: !currentStatus });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Banners Promocionais</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os banners que aparecem no topo da loja
          </p>
        </div>
        <BannerFormDialog />
      </div>

      <div className="grid gap-4">
        {banners?.map((banner) => (
          <Card key={banner.id} className="p-6">
            <div className="space-y-4">
              {/* Preview do Banner */}
              {banner.full_banner_image_url ? (
                <div className="relative w-full rounded-lg overflow-hidden border">
                  <img
                    src={banner.full_banner_image_url}
                    alt={banner.title}
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div
                  className="relative p-4 rounded-lg text-center overflow-hidden"
                  style={{
                    backgroundColor: banner.background_color,
                    color: banner.text_color,
                    backgroundImage: banner.background_image_url 
                      ? `url(${banner.background_image_url})` 
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold drop-shadow-lg">{banner.title}</h3>
                    {banner.description && (
                      <p className="text-sm opacity-90 mt-1 drop-shadow-lg">{banner.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Informações e Ações */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Ordem: {banner.display_order}</p>
                  <p>Rotação: {banner.rotation_seconds}s</p>
                  <p>Status: {banner.is_active ? 'Ativo' : 'Inativo'}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleActive(banner.id, banner.is_active)}
                    title={banner.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {banner.is_active ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>

                  <BannerFormDialog
                    banner={banner}
                    trigger={
                      <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    }
                  />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja deletar este banner? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteBanner.mutate(banner.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {!banners?.length && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              Nenhum banner cadastrado. Crie seu primeiro banner para começar!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
