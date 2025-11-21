import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2 } from 'lucide-react';
import { useCreateBanner, useUpdateBanner, Banner } from '@/hooks/useBanners';

interface BannerFormDialogProps {
  banner?: Banner;
  trigger?: React.ReactNode;
}

export function BannerFormDialog({ banner, trigger }: BannerFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#8B5CF6');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [rotationSeconds, setRotationSeconds] = useState(5);

  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();

  useEffect(() => {
    if (banner) {
      setTitle(banner.title);
      setDescription(banner.description || '');
      setBackgroundColor(banner.background_color);
      setTextColor(banner.text_color);
      setIsActive(banner.is_active);
      setDisplayOrder(banner.display_order);
      setRotationSeconds(banner.rotation_seconds);
    }
  }, [banner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bannerData = {
      title,
      description,
      background_color: backgroundColor,
      text_color: textColor,
      is_active: isActive,
      display_order: displayOrder,
      rotation_seconds: rotationSeconds,
    };

    if (banner) {
      await updateBanner.mutateAsync({ id: banner.id, ...bannerData });
    } else {
      await createBanner.mutateAsync(bannerData);
    }

    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setBackgroundColor('#8B5CF6');
    setTextColor('#FFFFFF');
    setIsActive(true);
    setDisplayOrder(0);
    setRotationSeconds(5);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Banner
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{banner ? 'Editar Banner' : 'Criar Novo Banner'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="🎉 Frete GRÁTIS"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Em compras acima de R$100,00!"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Cor de Fundo</Label>
              <div className="flex gap-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="#8B5CF6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textColor">Cor do Texto</Label>
              <div className="flex gap-2">
                <Input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Ordem de Exibição</Label>
              <Input
                id="displayOrder"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value))}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rotationSeconds">Tempo de Rotação (segundos)</Label>
              <Input
                id="rotationSeconds"
                type="number"
                value={rotationSeconds}
                onChange={(e) => setRotationSeconds(parseInt(e.target.value))}
                min="1"
                max="60"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Banner Ativo</Label>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="p-4 rounded-lg text-center"
              style={{
                backgroundColor: backgroundColor,
                color: textColor,
              }}
            >
              <h3 className="text-xl font-bold">{title || 'Título do Banner'}</h3>
              {description && <p className="text-sm opacity-90 mt-1">{description}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createBanner.isPending || updateBanner.isPending}>
              {(createBanner.isPending || updateBanner.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {banner ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
