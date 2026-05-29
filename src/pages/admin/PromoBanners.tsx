import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  usePromoBanners,
  useDeletePromoBanner,
  useUpdatePromoBanner,
} from '@/hooks/usePromoBanners';
import { PromoBannerFormDialog } from '@/components/admin/PromoBannerFormDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PromoBanners() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { data: banners, isLoading } = usePromoBanners();
  const remove = useDeletePromoBanner();
  const update = useUpdatePromoBanner();

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
          <h1 className="text-3xl font-bold">Banners Promocionais Premium</h1>
          <p className="text-muted-foreground mt-1">
            Banners da home com imagem, cupom, descrição e botão (slider automático)
          </p>
        </div>
        <PromoBannerFormDialog />
      </div>

      <div className="grid gap-4">
        {banners?.map((b) => (
          <Card key={b.id} className="p-5">
            <div className="grid md:grid-cols-[200px_1fr_auto] gap-4 items-center">
              <div className="relative w-full h-32 rounded-lg overflow-hidden border bg-muted">
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={b.is_active ? 'default' : 'secondary'}>
                    {b.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Ordem: {b.display_order} • {b.rotation_seconds}s
                  </span>
                </div>
                {b.subtitle && (
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">
                    {b.subtitle}
                  </p>
                )}
                <h3 className="font-serif text-lg">{b.title}</h3>
                {b.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{b.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {b.coupon_code && (
                    <span>Cupom: <span className="font-mono text-foreground">{b.coupon_code}</span></span>
                  )}
                  <span>Botão: {b.button_label} → {b.button_link}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => update.mutate({ id: b.id, is_active: !b.is_active })}
                >
                  {b.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <PromoBannerFormDialog
                  banner={b}
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
                      <AlertDialogTitle>Remover banner?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => remove.mutate(b.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
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
              Nenhum banner promocional cadastrado. Crie o primeiro para destacar promoções, cupons e lançamentos.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
