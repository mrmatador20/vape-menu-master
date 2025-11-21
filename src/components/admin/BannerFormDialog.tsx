import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Upload, X } from 'lucide-react';
import { useCreateBanner, useUpdateBanner, Banner } from '@/hooks/useBanners';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [fullBannerImageFile, setFullBannerImageFile] = useState<File | null>(null);
  const [fullBannerImagePreview, setFullBannerImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bannerType, setBannerType] = useState<'color' | 'full'>('color');

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
      setBackgroundImagePreview(banner.background_image_url);
      setFullBannerImagePreview(banner.full_banner_image_url);
      
      if (banner.full_banner_image_url) {
        setBannerType('full');
      } else {
        setBannerType('color');
      }
    }
  }, [banner]);

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFullBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFullBannerImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFullBannerImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, type: 'background' | 'full') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${type}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('banners')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let backgroundImageUrl = banner?.background_image_url || null;
      let fullBannerImageUrl = banner?.full_banner_image_url || null;

      if (backgroundImageFile && bannerType === 'color') {
        backgroundImageUrl = await uploadImage(backgroundImageFile, 'background');
      }

      if (fullBannerImageFile && bannerType === 'full') {
        fullBannerImageUrl = await uploadImage(fullBannerImageFile, 'full');
      }

      const bannerData = {
        title,
        description,
        background_color: backgroundColor,
        text_color: textColor,
        background_image_url: bannerType === 'color' ? backgroundImageUrl : null,
        full_banner_image_url: bannerType === 'full' ? fullBannerImageUrl : null,
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
    } catch (error: any) {
      toast.error('Erro ao fazer upload da imagem: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setBackgroundColor('#8B5CF6');
    setTextColor('#FFFFFF');
    setIsActive(true);
    setDisplayOrder(0);
    setRotationSeconds(5);
    setBackgroundImageFile(null);
    setBackgroundImagePreview(null);
    setFullBannerImageFile(null);
    setFullBannerImagePreview(null);
    setBannerType('color');
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{banner ? 'Editar Banner' : 'Criar Novo Banner'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={bannerType} onValueChange={(v) => setBannerType(v as 'color' | 'full')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="color">Banner com Cor/Imagem de Fundo</TabsTrigger>
              <TabsTrigger value="full">Banner Completo (Imagem)</TabsTrigger>
            </TabsList>

            <TabsContent value="color" className="space-y-4">
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

              <div className="space-y-2">
                <Label>Imagem de Fundo (opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageChange}
                    className="flex-1"
                  />
                  {backgroundImagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setBackgroundImageFile(null);
                        setBackgroundImagePreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {backgroundImagePreview && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden">
                    <img
                      src={backgroundImagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
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
            </TabsContent>

            <TabsContent value="full" className="space-y-4">
              <div className="space-y-2">
                <Label>Upload do Banner Completo *</Label>
                <p className="text-sm text-muted-foreground">
                  Faça upload de uma imagem completa do banner (recomendado: 1920x200px)
                </p>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFullBannerImageChange}
                    required={bannerType === 'full' && !fullBannerImagePreview}
                    className="flex-1"
                  />
                  {fullBannerImagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setFullBannerImageFile(null);
                        setFullBannerImagePreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {fullBannerImagePreview && (
                  <div className="relative w-full rounded-lg overflow-hidden border">
                    <img
                      src={fullBannerImagePreview}
                      alt="Preview do banner completo"
                      className="w-full h-auto"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="titleFull">Título (para acessibilidade)</Label>
                <Input
                  id="titleFull"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Banner de Frete Grátis"
                  required
                />
              </div>
            </TabsContent>
          </Tabs>

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
          {bannerType === 'color' && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="relative p-4 rounded-lg text-center overflow-hidden"
                style={{
                  backgroundColor: backgroundColor,
                  color: textColor,
                  backgroundImage: backgroundImagePreview 
                    ? `url(${backgroundImagePreview})` 
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="relative z-10">
                  <h3 className="text-xl font-bold drop-shadow-lg">{title || 'Título do Banner'}</h3>
                  {description && <p className="text-sm opacity-90 mt-1 drop-shadow-lg">{description}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={uploading || createBanner.isPending || updateBanner.isPending}
            >
              {(uploading || createBanner.isPending || updateBanner.isPending) && (
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
