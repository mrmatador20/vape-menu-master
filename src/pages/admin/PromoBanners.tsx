import { Navigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import {
  usePromoBanners, useDeletePromoBanner, useUpdatePromoBanner,
} from '@/hooks/usePromoBanners';
import { PromoBannerFormDialog } from '@/components/admin/PromoBannerFormDialog';

export default function PromoBanners() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { data: banners, isLoading } = usePromoBanners();
  const del = useDeletePromoBanner();
  const upd = useUpdatePromoBanner();

  if (roleLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Banners Promocionais (Home)</h1>
          <p className="text-muted-foreground mt-1">
            Carrossel full-width exibido logo abaixo da seção “Bem-vindo”.
            Tamanhos ideais: desktop 1920×500, mobile 1080×1350 (.webp).
          </p>
        </div>
        <PromoBannerFormDialog />
      </div>

      <div className="grid gap-4">
        {banners?.map((b) => (
          <Card key={b.id} className="p-4">
            <div className="grid md:grid-cols-[260px_1fr_auto] gap-4 items-start">
              <div className="relative w-full aspect-[1920/500] rounded overflow-hidden border bg-muted">
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={b.is_active ? 'default' : 'secondary'}>
                    {b.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Ordem {b.display_order} • {b.rotation_seconds}s
                  </span>
                </div>
                {b.eyebrow && <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{b.eyebrow}</p>}
                <h3 className="text-lg font-semibold">{b.title}</h3>
                {b.subtitle && <p className="text-sm text-muted-foreground">{b.subtitle}</p>}
                <p className="text-xs text-muted-foreground">
                  CTA: <span className="font-medium">{b.button_label}</span> → {b.button_link}
                  {b.coupon_code && <> • Cupom: <span className="font-medium">{b.coupon_code}</span></>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="icon"
                  onClick={() => upd.mutate({ id: b.id, is_active: !b.is_active })}
                  title={b.is_active ? 'Desativar' : 'Ativar'}
                >
                  {b.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <PromoBannerFormDialog
                  banner={b}
                  trigger={<Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir banner?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => del.mutate(b.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}

        {!banners?.length && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              Nenhum banner promocional cadastrado. Clique em “Novo Banner Promocional”.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
