import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { optimizeImage } from '@/lib/imageOptimizer';

interface Props {
  value?: string | null;
  onChange: (next: string | null) => void;
}

export function VariantImageField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Tipo inválido', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande (>5MB)', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const { blob, filename, contentType } = await optimizeImage(file, { maxWidth: 1200, quality: 0.8 });
    const ext = filename.split('.').pop();
    const path = `variants/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, blob, { contentType, upsert: false });
    if (error) {
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
    } else {
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      onChange(data.publicUrl);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Variante" className="h-24 w-24 object-cover rounded-md border" />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-24 w-24 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 transition"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
          <span className="text-[10px] uppercase tracking-wide">Foto</span>
        </button>
      )}
      <p className="text-[11px] text-muted-foreground">
        Aparece como imagem principal quando o cliente seleciona esta cor.
      </p>
    </div>
  );
}
