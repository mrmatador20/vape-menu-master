import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X, Plus, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { optimizeImage } from '@/lib/imageOptimizer';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

interface SortableImageProps {
  id: string;
  url: string;
  index: number;
  onRemove: () => void;
}

function SortableImage({ id, url, index, onRemove }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <img src={url} alt={`Foto ${index + 1}`} className="h-20 w-20 object-cover rounded-md border" />
      {index === 0 && (
        <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-primary/80 text-primary-foreground rounded-b-md py-0.5">
          Principal
        </span>
      )}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 h-5 w-5 rounded bg-background/80 flex items-center justify-center cursor-grab active:cursor-grabbing"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="absolute -top-2 -right-2 h-6 w-6"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function VariantImagesField({ values, onChange, max = 6 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = values.findIndex((_, i) => `img-${i}` === active.id);
    const newIndex = values.findIndex((_, i) => `img-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(values, oldIndex, newIndex));
  };

  const ids = values.map((_, i) => `img-${i}`);

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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2">
            {values.map((url, i) => (
              <SortableImage
                key={`img-${i}`}
                id={`img-${i}`}
                url={url}
                index={i}
                onRemove={() => remove(i)}
              />
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
        </SortableContext>
      </DndContext>
      <p className="text-[11px] text-muted-foreground">
        {values.length}/{max} fotos. Arraste pela alça para reordenar — a primeira é a imagem principal.
      </p>
    </div>
  );
}
