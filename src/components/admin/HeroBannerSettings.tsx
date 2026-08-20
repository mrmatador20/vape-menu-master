import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ImageIcon, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';
import { useUpdateSetting } from '@/hooks/useSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useQueryClient } from '@tanstack/react-query';
import { optimizeImage } from '@/lib/imageOptimizer';
import { toast } from 'sonner';

const KEY = 'site_hero_image_url';

export default function HeroBannerSettings() {
  const { data: identity, isLoading } = useSiteIdentity();
  const { data: role } = useUserRole();
  const updateSetting = useUpdateSetting();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const canEdit = role === 'admin' || (role as string) === 'super_admin';
  const currentUrl = identity?.site_hero_image_url || '';

  const saveUrl = async (url: string) => {
    await updateSetting.mutateAsync({
      key: KEY,
      value: url,
      description: 'Imagem de fundo do banner de boas-vindas da home',
    });
    await queryClient.invalidateQueries({ queryKey: ['site-identity'] });
  };

  const handleFile = async (file: File) => {
    if (!canEdit) {
      toast.error('Permissão negada: apenas administradores podem alterar o banner.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Envie um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    setBusy(true);
    try {
      const { blob, filename, contentType } = await optimizeImage(file, { maxWidth: 1920, quality: 0.82 });
      const ext = filename.split('.').pop();
      const name = `hero/welcome-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('banners').upload(name, blob, { contentType, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('banners').getPublicUrl(name);
      await saveUrl(data.publicUrl);
      toast.success('Banner de boas-vindas atualizado!');
    } catch (e: any) {
      toast.error('Erro ao enviar imagem: ' + (e?.message ?? 'desconhecido'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!canEdit) {
      toast.error('Permissão negada: apenas administradores podem alterar o banner.');
      return;
    }
    setBusy(true);
    try {
      await saveUrl('');
      toast.success('Imagem removida. O fundo neutro padrão voltou a ser exibido.');
    } catch (e: any) {
      toast.error('Erro ao remover imagem: ' + (e?.message ?? 'desconhecido'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <CardTitle>Banner de Boas-Vindas (Hero Background)</CardTitle>
        </div>
        <CardDescription>
          Imagem de fundo da seção de boas-vindas da página inicial. Tamanho ideal: 1920×900 (.webp ou .jpg).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {currentUrl && (
              <div className="relative w-full aspect-[1920/700] rounded-md overflow-hidden border bg-muted">
                <img src={currentUrl} alt="Pré-visualização do banner de boas-vindas" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                  <span className="font-serif uppercase tracking-[0.15em] text-foreground text-sm sm:text-lg">
                    {identity?.site_hero_title}
                  </span>
                </div>
              </div>
            )}

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
              {busy ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                Arraste uma imagem aqui ou clique para selecionar
              </p>
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

            {!canEdit && (
              <p className="text-xs text-destructive">
                Você não tem permissão para alterar o banner de boas-vindas.
              </p>
            )}

            {currentUrl && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleRemove} disabled={!canEdit || busy}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover imagem
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
