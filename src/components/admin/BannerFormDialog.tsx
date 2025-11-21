import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Loader2, Upload, X, CalendarIcon } from 'lucide-react';
import { useCreateBanner, useUpdateBanner, Banner } from '@/hooks/useBanners';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [transitionType, setTransitionType] = useState('fade');
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [fullBannerImageFile, setFullBannerImageFile] = useState<File | null>(null);
  const [fullBannerImagePreview, setFullBannerImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bannerType, setBannerType] = useState<'color' | 'full'>('color');
  const [previewAnimating, setPreviewAnimating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [scheduledStart, setScheduledStart] = useState<Date | undefined>();
  const [scheduledEnd, setScheduledEnd] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');

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
      setTransitionType(banner.transition_type || 'fade');
      setBackgroundImagePreview(banner.background_image_url);
      setFullBannerImagePreview(banner.full_banner_image_url);
      
      if (banner.full_banner_image_url) {
        setBannerType('full');
      } else {
        setBannerType('color');
      }

      if (banner.scheduled_start) {
        const startDate = new Date(banner.scheduled_start);
        setScheduledStart(startDate);
        setStartTime(format(startDate, 'HH:mm'));
      }
      
      if (banner.scheduled_end) {
        const endDate = new Date(banner.scheduled_end);
        setScheduledEnd(endDate);
        setEndTime(format(endDate, 'HH:mm'));
      }
    }
  }, [banner]);

  // Auto-play animation preview
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      setPreviewAnimating(true);
      setShowPreview(false);
      
      setTimeout(() => {
        setShowPreview(true);
        setTimeout(() => {
          setPreviewAnimating(false);
        }, 600);
      }, 100);
    }, 3000);

    return () => clearInterval(interval);
  }, [open, transitionType]);

  const getTransitionClasses = () => {
    if (!previewAnimating) return '';
    
    switch (transitionType) {
      case 'fade':
        return showPreview ? 'animate-fade-in' : 'animate-fade-out';
      case 'slide-left':
        return showPreview ? 'animate-slide-in-left' : 'animate-slide-out-left';
      case 'slide-right':
        return showPreview ? 'animate-slide-in-right' : 'animate-slide-out-right';
      case 'slide-up':
        return showPreview ? 'animate-slide-in-up' : 'animate-slide-out-up';
      case 'slide-down':
        return showPreview ? 'animate-slide-in-down' : 'animate-slide-out-down';
      case 'zoom':
        return showPreview ? 'animate-zoom-in' : 'animate-zoom-out';
      default:
        return '';
    }
  };

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

  const combineDateAndTime = (date: Date, time: string): string => {
    const [hours, minutes] = time.split(':');
    const combined = new Date(date);
    combined.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return combined.toISOString();
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
        transition_type: transitionType,
        scheduled_start: scheduledStart ? combineDateAndTime(scheduledStart, startTime) : null,
        scheduled_end: scheduledEnd ? combineDateAndTime(scheduledEnd, endTime) : null,
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
    setTransitionType('fade');
    setBackgroundImageFile(null);
    setBackgroundImagePreview(null);
    setFullBannerImageFile(null);
    setFullBannerImagePreview(null);
    setBannerType('color');
    setScheduledStart(undefined);
    setScheduledEnd(undefined);
    setStartTime('00:00');
    setEndTime('23:59');
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

          <div className="space-y-2">
            <Label htmlFor="transitionType">Tipo de Transição</Label>
            <Select value={transitionType} onValueChange={setTransitionType}>
              <SelectTrigger id="transitionType">
                <SelectValue placeholder="Selecione o tipo de transição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fade">Fade (Dissolver)</SelectItem>
                <SelectItem value="slide-left">Deslizar para Esquerda</SelectItem>
                <SelectItem value="slide-right">Deslizar para Direita</SelectItem>
                <SelectItem value="slide-up">Deslizar para Cima</SelectItem>
                <SelectItem value="slide-down">Deslizar para Baixo</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Animação aplicada ao trocar entre banners
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Banner Ativo</Label>
          </div>

          {/* Scheduling Section */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Agendamento (Opcional)</h3>
              <p className="text-xs text-muted-foreground">
                Configure quando este banner deve ser exibido automaticamente
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date/Time */}
              <div className="space-y-2">
                <Label>Data/Hora de Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledStart ? format(scheduledStart, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledStart}
                      onSelect={setScheduledStart}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!scheduledStart}
                />
              </div>

              {/* End Date/Time */}
              <div className="space-y-2">
                <Label>Data/Hora de Término</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledEnd ? format(scheduledEnd, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledEnd}
                      onSelect={setScheduledEnd}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!scheduledEnd}
                />
              </div>
            </div>

            {scheduledStart && scheduledEnd && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                📅 Banner será exibido de <strong>{format(scheduledStart, "dd/MM/yyyy")}</strong> às <strong>{startTime}</strong> até <strong>{format(scheduledEnd, "dd/MM/yyyy")}</strong> às <strong>{endTime}</strong>
              </p>
            )}
            
            {scheduledStart && !scheduledEnd && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                📅 Banner será exibido a partir de <strong>{format(scheduledStart, "dd/MM/yyyy")}</strong> às <strong>{startTime}</strong>
              </p>
            )}
            
            {!scheduledStart && scheduledEnd && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                📅 Banner será exibido até <strong>{format(scheduledEnd, "dd/MM/yyyy")}</strong> às <strong>{endTime}</strong>
              </p>
            )}
          </div>

          {/* Animated Preview */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Preview com Animação</Label>
              <span className="text-xs text-muted-foreground">
                Animação se repete a cada 3 segundos
              </span>
            </div>
            <div className="relative h-32 bg-muted rounded-lg overflow-hidden">
              {showPreview && (
                <>
                  {bannerType === 'color' ? (
                    <div
                      className={`absolute inset-0 p-4 flex items-center justify-center text-center ${getTransitionClasses()}`}
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
                        <h3 className="text-lg font-bold drop-shadow-lg">
                          {title || 'Título do Banner'}
                        </h3>
                        {description && (
                          <p className="text-sm opacity-90 mt-1 drop-shadow-lg">
                            {description}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    fullBannerImagePreview && (
                      <img
                        src={fullBannerImagePreview}
                        alt="Preview"
                        className={`absolute inset-0 w-full h-full object-cover ${getTransitionClasses()}`}
                      />
                    )
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Transição atual: <strong>
                {transitionType === 'fade' ? 'Fade (Dissolver)' :
                 transitionType === 'slide-left' ? 'Deslizar para Esquerda' :
                 transitionType === 'slide-right' ? 'Deslizar para Direita' :
                 transitionType === 'slide-up' ? 'Deslizar para Cima' :
                 transitionType === 'slide-down' ? 'Deslizar para Baixo' :
                 transitionType === 'zoom' ? 'Zoom' : 'Fade'}
              </strong>
            </p>
          </div>

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
