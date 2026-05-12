import { useMemo, useState } from 'react';
import { useFlavors, Flavor } from '@/hooks/useFlavors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Copy, Plus, Sparkles, Search, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FlavorFormDialog } from './FlavorFormDialog';
import { GenerateVariantsDialog } from './GenerateVariantsDialog';
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flavors.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.sku || '').toLowerCase().includes(q) ||
        (f.color || '').toLowerCase().includes(q) ||
        (f.size || '').toLowerCase().includes(q),
    );
  }, [flavors, search]);

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
              <TableHead>Variante</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {flavors.length === 0 ? 'Nenhuma variante. Crie uma ou gere combinações automaticamente.' : 'Nenhum resultado.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {f.image_url ? (
                        <img src={f.image_url} alt={f.name} className="h-8 w-8 rounded object-cover border" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted border" />
                      )}
                      <span>{f.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{f.size || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {f.color ? (
                      <div className="flex items-center gap-2">
                        {f.color_hex && (
                          <span className="inline-block h-4 w-4 rounded-full border" style={{ background: f.color_hex }} />
                        )}
                        <span>{f.color}</span>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {f.sku ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.sku}</code> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={f.stock === 0 ? 'destructive' : f.stock < 5 ? 'outline' : 'secondary'}>
                      {f.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {f.price ? `R$ ${Number(f.price).toFixed(2)}` : <span className="text-muted-foreground">base</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button type="button" size="icon" variant="ghost" onClick={() => handleDuplicate(f)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => { setEditing(f); setOpen(true); }} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(f.id)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
