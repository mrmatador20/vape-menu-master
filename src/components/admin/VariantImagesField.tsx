import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X, Image as ImageIcon, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

export function VariantImagesField({ values, onChange, max = 6 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const remaining = max - values.length;
    if (remaining <= 0) {
      toast({ title: `Máximo ${max} fotos por cor`, variant: 'destructive' });
      return;
    }
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      if (!allowed.includes(file.type)) {
        toast({ title: `Tipo inválido: ${file.name}`, variant: 'destructive' });
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: `${file.name} > 5MB`, variant: 'destructive' });
        continue;
      }
      const ext = file.name.split('.').pop();
      const path = `variants/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) {
        toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
      } else {
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
    }
    if (uploaded.length) onChange([...values, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFiles}
      />
      <div className="flex flex-wrap gap-2">
        {values.map((url, i) => (
          <div key={i} className="relative">
            <img src={url} alt={`Foto ${i + 1}`} className="h-20 w-20 object-cover rounded-md border" />
            {i === 0 && (
              <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-primary/80 text-primary-foreground rounded-b-md py-0.5">
                Principal
              </span>
            )}
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={() => remove(i)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {values.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-20 w-20 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 transition"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            <span className="text-[10px] uppercase tracking-wide">Foto</span>
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {values.length}/{max} fotos. A primeira é a imagem principal exibida ao selecionar esta cor.
      </p>
    </div>
  );
}
