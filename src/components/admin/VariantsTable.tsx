import { useEffect, useMemo, useState } from 'react';
import { useFlavors, Flavor } from '@/hooks/useFlavors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Copy, Plus, Sparkles, Search, Package, GripVertical } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FlavorFormDialog } from './FlavorFormDialog';
import { GenerateVariantsDialog } from './GenerateVariantsDialog';
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
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  productId: string;
  productName: string;
}

export function VariantsTable({ productId, productName }: Props) {
  const { data: flavors = [], isLoading } = useFlavors(productId);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Flavor | null>(null);
  const [open, setOpen] = useState(false);
  const [openGen, setOpenGen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  useEffect(() => {
    setOrderedIds(flavors.map((f) => f.id));
  }, [flavors]);

  const ordered = useMemo(() => {
    const map = new Map(flavors.map((f) => [f.id, f]));
    const list = orderedIds.map((id) => map.get(id)).filter(Boolean) as Flavor[];
    flavors.forEach((f) => { if (!orderedIds.includes(f.id)) list.push(f); });
    return list;
  }, [flavors, orderedIds]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ordered.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.sku || '').toLowerCase().includes(q) ||
        (f.color || '').toLowerCase().includes(q) ||
        (f.size || '').toLowerCase().includes(q),
    );
  }, [ordered, search]);

  const isSearching = search.trim().length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(next);

    const updates = next.map((id, idx) =>
      supabase.from('flavors').update({ display_order: idx }).eq('id', id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error('Erro ao salvar ordem: ' + failed.error.message);
    } else {
      toast.success('Ordem salva');
    }
    qc.invalidateQueries({ queryKey: ['flavors', productId] });
  };

  const totalStock = flavors.reduce((sum, f) => sum + (f.stock || 0), 0);

  const handleDuplicate = async (f: Flavor) => {
    const { error } = await supabase.from('flavors').insert({
      product_id: productId,
      name: f.name + ' (cópia)',
      stock: f.stock,
      price: f.price ?? null,
      color: f.color ?? null,
      color_hex: f.color_hex ?? null,
      size: f.size ?? null,
      sku: f.sku ? f.sku + '-COPY' : null,
    });
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Variante duplicada');
    qc.invalidateQueries({ queryKey: ['flavors', productId] });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('flavors').delete().eq('id', deleteId);
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Variante excluída');
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ['flavors', productId] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2"><Package className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="font-semibold">{flavors.length} variante(s)</p>
            <p className="text-xs text-muted-foreground">Estoque total: {totalStock} unidades</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setOpenGen(true)}>
            <Sparkles className="h-4 w-4 mr-2" /> Gerar combinações
          </Button>
          <Button type="button" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar variante
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar por nome, SKU, cor, tamanho..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Variante</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {flavors.length === 0 ? 'Nenhuma variante. Crie uma ou gere combinações automaticamente.' : 'Nenhum resultado.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((f) => (
                    <SortableVariantRow
                      key={f.id}
                      flavor={f}
                      draggable={!isSearching}
                      onDuplicate={() => handleDuplicate(f)}
                      onEdit={() => { setEditing(f); setOpen(true); }}
                      onDelete={() => setDeleteId(f.id)}
                    />
                  ))
                )}
              </TableBody>
            </SortableContext>
          </DndContext>
        </Table>
      </div>
      {isSearching && (
        <p className="text-xs text-muted-foreground">Limpe a busca para reordenar as variantes.</p>
      )}

      <FlavorFormDialog open={open} onOpenChange={setOpen} productId={productId} flavor={editing} />
      <GenerateVariantsDialog open={openGen} onOpenChange={setOpenGen} productId={productId} productName={productName} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir variante?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
