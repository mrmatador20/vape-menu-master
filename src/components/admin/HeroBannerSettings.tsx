import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { Loader2, ImageIcon, Trash2, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useQueryClient } from '@tanstack/react-query';
import { useAllHeroBanners, type HeroBanner } from '@/hooks/useHeroBanners';
import { optimizeImage } from '@/lib/imageOptimizer';
import { toast } from 'sonner';

export default function HeroBannerSettings() {
  const { data: banners, isLoading } = useAllHeroBanners();
  const { data: role } = useUserRole();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [opacityDraft, setOpacityDraft] = useState<Record<string, number>>({});

  const canEdit = role === 'admin' || (role as string) === 'super_admin';
  const list = banners ?? [];

  useEffect(() => {
    setOpacityDraft((prev) => {
      const next = { ...prev };
      list.forEach((b) => {
        if (next[b.id] === undefined) next[b.id] = b.opacity;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['home-hero-banners'] });

  const guard = () => {
    if (!canEdit) {
      toast.error('Permissão negada: apenas administradores podem gerenciar os banners.');
      return false;
    }
    return true;
  };

  const handleFile = async (file: File) => {
    if (!guard()) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Envie um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    setBusy(true);
    try {
      const { blob, filename, contentType } = await optimizeImage(file, { maxWidth: 1920, quality: 0.82 });
      const ext = filename.split('.').pop();
      const name = `hero/welcome-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('banners').upload(name, blob, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('banners').getPublicUrl(name);
      const nextOrder = list.length ? Math.max(...list.map((b) => b.display_order)) + 1 : 0;
      const { error } = await supabase.from('home_hero_banners').insert({
        image_url: data.publicUrl,
        display_order: nextOrder,
      });
      if (error) throw error;
      await refresh();
      toast.success('Banner adicionado ao carrossel!');
    } catch (e: any) {
      toast.error('Erro ao enviar imagem: ' + (e?.message ?? 'desconhecido'));
    } finally {
      setBusy(false);
    }
  };

  const updateBanner = async (id: string, patch: Partial<HeroBanner>, successMsg?: string) => {
    if (!guard()) return;
    const { error } = await supabase.from('home_hero_banners').update(patch).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar banner: ' + error.message);
      return;
    }
    await refresh();
    if (successMsg) toast.success(successMsg);
  };

  const move = async (banner: HeroBanner, dir: -1 | 1) => {
    const idx = list.findIndex((b) => b.id === banner.id);
    const target = list[idx + dir];
    if (!target) return;
    if (!guard()) return;
    const a = supabase.from('home_hero_banners').update({ display_order: target.display_order }).eq('id', banner.id);
    const b = supabase.from('home_hero_banners').update({ display_order: banner.display_order }).eq('id', target.id);
    const [r1, r2] = await Promise.all([a, b]);
    if (r1.error || r2.error) {
      toast.error('Erro ao reordenar banners.');
      return;
    }
    await refresh();
  };

  const remove = async (banner: HeroBanner) => {
    if (!guard()) return;
    const { error } = await supabase.from('home_hero_banners').delete().eq('id', banner.id);
    if (error) {
      toast.error('Erro ao excluir banner: ' + error.message);
      return;
    }
    await refresh();
    toast.success('Banner excluído.');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <CardTitle>Banners de Boas-Vindas (Hero Slideshow)</CardTitle>
        </div>
        <CardDescription>
          Carrossel da seção de boas-vindas da página inicial. Tamanho ideal: 1920×900 (.webp ou .jpg).
          A opacidade controla a camada sobre a imagem — quanto maior, mais suave a imagem e maior a legibilidade do texto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onClick={() => canEdit && !busy && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? 'border-primary bg-primary/5' : 'border-border'
          } ${canEdit && !busy ? 'cursor-pointer hover:border-primary/60' : 'opacity-60 cursor-not-allowed'}`}
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
          <p className="text-sm text-muted-foreground">Arraste uma imagem aqui ou clique para selecionar</p>
          <p className="text-xs text-muted-foreground">JPG, PNG ou WebP</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum banner cadastrado. O fundo neutro padrão será exibido na home.
          </p>
        ) : (
          <div className="space-y-4">
            {list.map((banner, i) => (
              <div key={banner.id} className="rounded-lg border p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative w-full sm:w-56 aspect-[16/7] rounded-md overflow-hidden border bg-muted shrink-0">
                    <img src={banner.image_url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
                    <div
                      className="absolute inset-0 bg-background"
                      style={{ opacity: (opacityDraft[banner.id] ?? banner.opacity) / 100 }}
                    />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium">Banner {i + 1}</span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" disabled={i === 0 || !canEdit} onClick={() => move(banner, -1)} aria-label="Mover para cima">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={i === list.length - 1 || !canEdit} onClick={() => move(banner, 1)} aria-label="Mover para baixo">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" disabled={!canEdit} aria-label="Excluir banner">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir este banner?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O banner deixará de aparecer no carrossel da home.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(banner)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Opacidade da camada</Label>
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {opacityDraft[banner.id] ?? banner.opacity}%
                        </span>
                      </div>
                      <Slider
                        value={[opacityDraft[banner.id] ?? banner.opacity]}
                        min={0}
                        max={100}
                        step={1}
                        disabled={!canEdit}
                        onValueChange={(v) => setOpacityDraft((p) => ({ ...p, [banner.id]: v[0] }))}
                        onValueCommit={(v) => updateBanner(banner.id, { opacity: v[0] }, 'Opacidade atualizada!')}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={banner.show_text_overlay}
                        disabled={!canEdit}
                        onCheckedChange={(checked) =>
                          updateBanner(
                            banner.id,
                            { show_text_overlay: checked },
                            checked ? 'Texto será exibido neste banner.' : 'Texto ocultado neste banner.',
                          )
                        }
                      />
                      <Label className="text-sm">Exibir texto sobre o banner</Label>
                    </div>

                    {banner.show_text_overlay && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Título do Banner</Label>
                          <Input
                            defaultValue={banner.title ?? ''}
                            maxLength={80}
                            disabled={!canEdit}
                            placeholder="Ex.: Bem-vindo à Fox Velour"
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== (banner.title ?? '')) updateBanner(banner.id, { title: v || null }, 'Título atualizado!');
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Subtítulo do Banner</Label>
                          <Textarea
                            defaultValue={banner.subtitle ?? ''}
                            maxLength={280}
                            rows={3}
                            disabled={!canEdit}
                            placeholder="Texto menor exibido abaixo do título"
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== (banner.subtitle ?? '')) updateBanner(banner.id, { subtitle: v || null }, 'Subtítulo atualizado!');
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Deixe em branco para exibir apenas a imagem deste slide.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={banner.is_active}
                        disabled={!canEdit}
                        onCheckedChange={(checked) =>
                          updateBanner(banner.id, { is_active: checked }, checked ? 'Banner ativado.' : 'Banner desativado.')
                        }
                      />
                      <Label className="text-sm">{banner.is_active ? 'Ativo' : 'Inativo'}</Label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
