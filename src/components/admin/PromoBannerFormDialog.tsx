import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { optimizeImage } from '@/lib/imageOptimizer';
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
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [eyebrow, setEyebrow] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [buttonLabel, setButtonLabel] = useState('Comprar Agora');
  const [buttonLink, setButtonLink] = useState('/');
  const [couponCode, setCouponCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showButton, setShowButton] = useState(false);
  const [isClickable, setIsClickable] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [rotationSeconds, setRotationSeconds] = useState(6);
  const [overlayOpacity, setOverlayOpacity] = useState(0.35);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  const [imageUrl, setImageUrl] = useState<string>('');
  const [mobileImageUrl, setMobileImageUrl] = useState<string>('');
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);

  const create = useCreatePromoBanner();
  const update = useUpdatePromoBanner();

  useEffect(() => {
    if (!banner) return;
    setTitle(banner.title);
    setEyebrow(banner.eyebrow || '');
    setSubtitle(banner.subtitle || '');
    setDescription(banner.description || '');
    setButtonLabel(banner.button_label);
    setButtonLink(banner.button_link);
    setCouponCode(banner.coupon_code || '');
    setIsActive(banner.is_active);
    setShowButton(banner.show_button ?? false);
    setIsClickable(banner.is_clickable ?? true);
    setDisplayOrder(banner.display_order);
    setRotationSeconds(banner.rotation_seconds);
    setOverlayOpacity(Number(banner.overlay_opacity ?? 0.35));
    setTextAlign((banner.text_align as any) || 'left');
    setImageUrl(banner.image_url || '');
    setMobileImageUrl(banner.mobile_image_url || '');
  }, [banner]);

  const reset = () => {
    setTitle(''); setEyebrow(''); setSubtitle(''); setDescription('');
    setButtonLabel('Comprar Agora'); setButtonLink('/'); setCouponCode('');
    setIsActive(true); setShowButton(false); setIsClickable(true); setDisplayOrder(0); setRotationSeconds(6);
    setOverlayOpacity(0.35); setTextAlign('left');
    setImageUrl(''); setMobileImageUrl(''); setDesktopFile(null); setMobileFile(null);
  };

  const uploadFile = async (file: File, prefix: string) => {
    const { blob, filename, contentType } = await optimizeImage(file, { maxWidth: 1920, quality: 0.8 });
    const ext = filename.split('.').pop();
    const name = `promo/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('banners').upload(name, blob, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from('banners').getPublicUrl(name);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let finalImage = imageUrl;
      let finalMobile = mobileImageUrl;
      if (desktopFile) finalImage = await uploadFile(desktopFile, 'desktop');
      if (mobileFile) finalMobile = await uploadFile(mobileFile, 'mobile');

      if (!finalImage) {
        toast.error('Envie a imagem desktop (1920x500).');
        setUploading(false);
        return;
      }

      const payload = {
        title: title || null,
        eyebrow: eyebrow || null,
        subtitle: subtitle || null,
        description: description || null,
        button_label: buttonLabel || null,
        button_link: buttonLink || null,
        coupon_code: couponCode || null,
        is_active: isActive,
        show_button: showButton,
        is_clickable: isClickable,
        display_order: displayOrder,
        rotation_seconds: rotationSeconds,
        overlay_opacity: overlayOpacity,
        text_align: textAlign,
        image_url: finalImage,
        mobile_image_url: finalMobile || null,
        scheduled_start: null,
        scheduled_end: null,
      };

      if (banner) {
        await update.mutateAsync({ id: banner.id, ...payload });
      } else {
        await create.mutateAsync(payload as any);
      }
      setOpen(false);
      if (!banner) reset();
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || 'falha ao salvar'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full sm:w-auto whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" /> Novo Banner Promocional
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{banner ? 'Editar Banner Promocional' : 'Novo Banner Promocional'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Images */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Imagem Desktop (1920×500) *</Label>
              <Input
                type="file"
                accept="image/webp,image/jpeg,image/png"
                onChange={(e) => setDesktopFile(e.target.files?.[0] || null)}
              />
              {(desktopFile || imageUrl) && (
                <div className="relative w-full aspect-[1920/500] rounded overflow-hidden border bg-muted">
                  <img
                    src={desktopFile ? URL.createObjectURL(desktopFile) : imageUrl}
                    className="w-full h-full object-cover"
                    alt="Preview desktop"
                  />
                  {imageUrl && !desktopFile && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Imagem Mobile (1080×1350)</Label>
              <Input
                type="file"
                accept="image/webp,image/jpeg,image/png"
                onChange={(e) => setMobileFile(e.target.files?.[0] || null)}
              />
              {(mobileFile || mobileImageUrl) && (
                <div className="relative w-32 aspect-[4/5] rounded overflow-hidden border bg-muted">
                  <img
                    src={mobileFile ? URL.createObjectURL(mobileFile) : mobileImageUrl}
                    className="w-full h-full object-cover"
                    alt="Preview mobile"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">Opcional — se vazio, usa a imagem desktop.</p>
            </div>
          </div>

          {/* Texts */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sobre-título (eyebrow)</Label>
              <Input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="EDIÇÃO LIMITADA" />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="COLEÇÃO CASUAL" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Promoção 10% off em moda fitness" />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Show button toggle */}
          <div className="flex items-center gap-2 rounded border p-3 bg-muted/30">
            <Switch checked={showButton} onCheckedChange={setShowButton} id="pb-show-btn" />
            <Label htmlFor="pb-show-btn" className="cursor-pointer">
              Exibir botão "Comprar Agora" neste banner
            </Label>
          </div>

          {/* Clickable toggle */}
          <div className="flex items-center gap-2 rounded border p-3 bg-muted/30">
            <Switch checked={isClickable} onCheckedChange={setIsClickable} id="pb-clickable" />
            <Label htmlFor="pb-clickable" className="cursor-pointer">
              Banner clicável (a imagem inteira redireciona para o link)
            </Label>
          </div>

          {/* CTA */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Texto do botão</Label>
              <Input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Link do botão</Label>
              <Input value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} placeholder="/c/moda" />
            </div>
            <div className="space-y-2">
              <Label>Cupom (opcional)</Label>
              <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="VELOUR10" />
            </div>
          </div>

          {/* Style */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Alinhamento</Label>
              <Select value={textAlign} onValueChange={(v) => setTextAlign(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Escurecimento (0–1)</Label>
              <Input
                type="number" step="0.05" min="0" max="1"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rotação (segundos)</Label>
              <Input
                type="number" min="2" max="30"
                value={rotationSeconds}
                onChange={(e) => setRotationSeconds(parseInt(e.target.value) || 6)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ordem de exibição</Label>
              <Input
                type="number" min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="pb-active" />
              <Label htmlFor="pb-active">Banner ativo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
