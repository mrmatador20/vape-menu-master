import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Plus, Pencil, Trash2, Tags, Save, X, Search, FolderTree, Package, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { cn } from '@/lib/utils';

export default function AdminCategories() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useCategories();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchSub, setSearchSub] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newSub, setNewSub] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [deleteCat, setDeleteCat] = useState<{ id: string; name: string; count: number } | null>(null);
  const [deleteSub, setDeleteSub] = useState<{ id: string; name: string; count: number } | null>(null);

  const selectedCat = categories.find((c) => c.id === selectedId) || null;
  const { data: subs = [] } = useSubcategories(selectedCat?.id, selectedCat?.name);

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (role !== 'admin') return <Navigate to="/" replace />;

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredSubs = subs.filter((s) => s.name.toLowerCase().includes(searchSub.toLowerCase()));

  const createCat = async () => {
    const name = newCat.trim();
    if (!name) return;
    const { error } = await supabase.from('categories').insert({ name } as any);
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Categoria criada');
    setNewCat('');
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveRename = async (id: string, oldName: string) => {
    const name = editName.trim();
    if (!name || name === oldName) {
      setEditingId(null);
      return;
    }
    const { error: e1 } = await supabase.from('categories').update({ name } as any).eq('id', id);
    if (e1) return toast.error('Erro: ' + e1.message);
    await supabase.from('products').update({ category: name }).eq('category', oldName);
    toast.success('Categoria renomeada');
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ['categories'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  const handleDeleteCat = async () => {
    if (!deleteCat) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteCat.id);
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Categoria removida');
    if (selectedId === deleteCat.id) setSelectedId(null);
    setDeleteCat(null);
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  const createSub = async () => {
    const name = newSub.trim();
    if (!name || !selectedCat) return;
    const { error } = await supabase.from('subcategories' as any).insert({ name, category_id: selectedCat.id } as any);
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Subcategoria criada');
    setNewSub('');
    qc.invalidateQueries({ queryKey: ['subcategories', selectedCat.id] });
  };

  const saveRenameSub = async (id: string, oldName: string) => {
    const name = editSubName.trim();
    if (!name || name === oldName || !selectedCat) {
      setEditingSubId(null);
      return;
    }
    const { error: e1 } = await supabase.from('subcategories' as any).update({ name } as any).eq('id', id);
    if (e1) return toast.error('Erro: ' + e1.message);
    await supabase.from('products').update({ subcategory: name }).eq('category', selectedCat.name).eq('subcategory', oldName);
    toast.success('Subcategoria renomeada');
    setEditingSubId(null);
    qc.invalidateQueries({ queryKey: ['subcategories', selectedCat.id] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  const handleDeleteSub = async () => {
    if (!deleteSub) return;
    const { error } = await supabase.from('subcategories' as any).delete().eq('id', deleteSub.id);
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Subcategoria removida');
    setDeleteSub(null);
    qc.invalidateQueries({ queryKey: ['subcategories', selectedCat?.id] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FolderTree className="h-7 w-7 text-primary" />
          Categorias & Subcategorias
        </h1>
        <p className="text-muted-foreground">Gerencie a estrutura de categorização do catálogo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorias */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5 text-primary" /> Categorias</CardTitle>
              <Badge variant="outline">{categories.length}</Badge>
            </div>
            <CardDescription>Clique em uma categoria para gerenciar suas subcategorias.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Nova categoria..." value={newCat} onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createCat()} />
              <Button onClick={createCat} disabled={!newCat.trim()}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {isLoading && <Loader2 className="h-5 w-5 animate-spin mx-auto" />}
              {!isLoading && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma categoria encontrada.</p>
              )}
              {filtered.map((c) => (
                <div key={c.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg border p-3 transition-all cursor-pointer',
                    selectedId === c.id ? 'border-primary bg-accent/50 shadow-sm' : 'hover:bg-accent/30'
                  )}
                  onClick={() => editingId !== c.id && setSelectedId(c.id)}
                >
                  {editingId === c.id ? (
                    <>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveRename(c.id, c.name); if (e.key === 'Escape') setEditingId(null); }}
                        onClick={(e) => e.stopPropagation()} />
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); saveRename(c.id, c.name); }}><Save className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" /> {c.product_count} produto{c.product_count === 1 ? '' : 's'}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditName(c.name); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteCat({ id: c.id, name: c.name, count: c.product_count || 0 }); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subcategorias */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5 text-primary" /> Subcategorias</CardTitle>
              {selectedCat && <Badge variant="outline">{subs.length}</Badge>}
            </div>
            <CardDescription>
              {selectedCat ? <>Gerenciando subcategorias de <strong>{selectedCat.name}</strong></> : 'Selecione uma categoria à esquerda.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedCat ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderTree className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Selecione uma categoria para ver suas subcategorias.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input placeholder="Nova subcategoria..." value={newSub} onChange={(e) => setNewSub(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createSub()} />
                  <Button onClick={createSub} disabled={!newSub.trim()}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="Buscar..." value={searchSub} onChange={(e) => setSearchSub(e.target.value)} />
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredSubs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma subcategoria.</p>
                  )}
                  {filteredSubs.map((s) => (
                    <div key={s.id} className="group flex items-center gap-2 rounded-lg border p-3 hover:bg-accent/30 transition-colors">
                      {editingSubId === s.id ? (
                        <>
                          <Input value={editSubName} onChange={(e) => setEditSubName(e.target.value)} autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') saveRenameSub(s.id, s.name); if (e.key === 'Escape') setEditingSubId(null); }} />
                          <Button size="icon" variant="ghost" onClick={() => saveRenameSub(s.id, s.name)}><Save className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingSubId(null)}><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Package className="h-3 w-3" /> {s.product_count} produto{s.product_count === 1 ? '' : 's'}
                            </p>
                          </div>
                          <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100"
                            onClick={() => { setEditingSubId(s.id); setEditSubName(s.name); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => setDeleteSub({ id: s.id, name: s.name, count: s.product_count || 0 })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteCat} onOpenChange={(o) => !o && setDeleteCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria "{deleteCat?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCat && deleteCat.count > 0
                ? `Esta categoria possui ${deleteCat.count} produto(s). A categoria será removida, mas os produtos continuarão existindo (recomenda-se reorganizá-los antes).`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCat} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSub} onOpenChange={(o) => !o && setDeleteSub(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir subcategoria "{deleteSub?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteSub && deleteSub.count > 0
                ? `Esta subcategoria possui ${deleteSub.count} produto(s). Eles continuarão na categoria pai sem subcategoria.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSub} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
