import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MAX_IMAGES = 12;

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

export function ProductImagesField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const images = value || [];

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) {
      toast({ title: `Máximo ${MAX_IMAGES} imagens`, variant: 'destructive' });
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const toUpload = files.slice(0, slots).filter(f => {
      if (!allowed.includes(f.type)) {
        toast({ title: `Tipo inválido: ${f.name}`, variant: 'destructive' });
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: `Muito grande (>5MB): ${f.name}`, variant: 'destructive' });
        return false;
      }
      return true;
    });

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      const ext = file.name.split('.').pop();
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) {
        toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
        continue;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    onChange([...images, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFiles}
      />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {images.length}/{MAX_IMAGES} imagens. A primeira é a capa.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || images.length >= MAX_IMAGES}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Adicionar fotos
        </Button>
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div key={url + i} className="relative group border rounded-lg overflow-hidden">
              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-24 object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">Capa</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={() => move(i, 1)} disabled={i === images.length - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={() => remove(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
