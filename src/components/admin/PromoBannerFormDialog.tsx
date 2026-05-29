import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  PromoBanner,
  useCreatePromoBanner,
  useUpdatePromoBanner,
} from '@/hooks/usePromoBanners';

interface Props {
  banner?: PromoBanner;
  trigger?: React.ReactNode;
}

export function PromoBannerFormDialog({ banner, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [buttonLabel, setButtonLabel] = useState('Comprar Agora');
  const [buttonLink, setButtonLink] = useState('/');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [rotationSeconds, setRotationSeconds] = useState(6);
  const [uploading, setUploading] = useState(false);

  const create = useCreatePromoBanner();
  const update = useUpdatePromoBanner();

  useEffect(() => {
    if (banner) {
      setTitle(banner.title);
      setSubtitle(banner.subtitle || '');
      setDescription(banner.description || '');
      setCouponCode(banner.coupon_code || '');
      setButtonLabel(banner.button_label);
      setButtonLink(banner.button_link);
      setImagePreview(banner.image_url);
      setIsActive(banner.is_active);
      setDisplayOrder(banner.display_order);
      setRotationSeconds(banner.rotation_seconds);
    }
  }, [banner]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const r = new FileReader();
    r.onloadend = () => setImagePreview(r.result as string);
    r.readAsDataURL(f);
  };

  const uploadImage = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `promo/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('banners').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('banners').getPublicUrl(path);
    return data.publicUrl;
  };

  const reset = () => {
    setTitle(''); setSubtitle(''); setDescription(''); setCouponCode('');
    setButtonLabel('Comprar Agora'); setButtonLink('/');
    setImageFile(null); setImagePreview(null);
    setIsActive(true); setDisplayOrder(0); setRotationSeconds(6);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview && !imageFile) {
      toast.error('Selecione uma imagem para o banner');
      return;
    }
    setUploading(true);
    try {
      let imageUrl = banner?.image_url || '';
      if (imageFile) imageUrl = await uploadImage(imageFile);

      const payload = {
        title,
        subtitle: subtitle || null,
        description: description || null,
        coupon_code: couponCode || null,
        button_label: buttonLabel || 'Comprar Agora',
        button_link: buttonLink || '/',
        image_url: imageUrl,
        is_active: isActive,
        display_order: displayOrder,
        rotation_seconds: rotationSeconds,
        scheduled_start: null,
        scheduled_end: null,
      };

      if (banner) await update.mutateAsync({ id: banner.id, ...payload });
      else await create.mutateAsync(payload);

      setOpen(false);
      if (!banner) reset();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Banner Promocional
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {banner ? 'Editar Banner Promocional' : 'Novo Banner Promocional'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Subtítulo (etiqueta superior)</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="NOVA COLEÇÃO"
            />
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Até 20% OFF em peças selecionadas"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Elegância, performance e sofisticação em cada detalhe."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cupom (opcional)</Label>
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="FOX20"
              />
            </div>
            <div className="space-y-2">
              <Label>Texto do botão</Label>
              <Input
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="Comprar Agora"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Link do botão</Label>
            <Input
              value={buttonLink}
              onChange={(e) => setButtonLink(e.target.value)}
              placeholder="/ ou /?category=Moda"
            />
          </div>

          <div className="space-y-2">
            <Label>Imagem (.webp recomendado) *</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/webp,image/jpeg,image/png"
                onChange={handleFile}
                className="flex-1"
              />
              {imagePreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {imagePreview && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Rotação (segundos)</Label>
              <Input
                type="number"
                value={rotationSeconds}
                onChange={(e) => setRotationSeconds(parseInt(e.target.value) || 6)}
                min={2}
                max={60}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="promo-active" />
            <Label htmlFor="promo-active">Ativo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {banner ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
