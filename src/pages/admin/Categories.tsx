import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Plus, Pencil, Trash2, Tags, Save, X, Search, FolderTree, Package, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { useCategories, type Category } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useDepartments, type Department } from '@/hooks/useDepartments';
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

  const { data: departments = [], isLoading: depsLoading } = useDepartments();
  const { data: allCategories = [], isLoading: catsLoading } = useCategories();

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // search
  const [searchDept, setSearchDept] = useState('');
  const [searchCat, setSearchCat] = useState('');
  const [searchSub, setSearchSub] = useState('');

  // new
  const [newDept, setNewDept] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newSub, setNewSub] = useState('');

  // edit
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState('');

  // delete confirmations
  const [deleteDept, setDeleteDept] = useState<{ id: string; name: string; count: number } | null>(null);
  const [deleteCat, setDeleteCat] = useState<{ id: string; name: string; count: number } | null>(null);
  const [deleteSub, setDeleteSub] = useState<{ id: string; name: string; count: number } | null>(null);

  const selectedDept = departments.find((d) => d.id === selectedDeptId) || null;
  const deptCategories = useMemo(
    () => (selectedDept ? allCategories.filter((c) => c.department_id === selectedDept.id) : []),
    [allCategories, selectedDept],
  );
  const orphanCategories = useMemo(
    () => allCategories.filter((c) => !c.department_id),
    [allCategories],
  );
  const selectedCat = deptCategories.find((c) => c.id === selectedCatId) || null;
  const { data: subs = [] } = useSubcategories(selectedCat?.id, selectedCat?.name);

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (role !== 'admin') return <Navigate to="/" replace />;

  const filteredDepts = departments.filter((d) => d.name.toLowerCase().includes(searchDept.toLowerCase()));
  const filteredCats = deptCategories.filter((c) => c.name.toLowerCase().includes(searchCat.toLowerCase()));
  const filteredSubs = subs.filter((s) => s.name.toLowerCase().includes(searchSub.toLowerCase()));

  const deptCategoryCount = (id: string) => allCategories.filter((c) => c.department_id === id).length;

  /* ---------------- Departments ---------------- */
  const createDept = async () => {
    const name = newDept.trim();
    if (!name) return;
    const { error } = await (supabase.from('departments' as any).insert({ name } as any));
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Departamento criado');
    setNewDept('');
    qc.invalidateQueries({ queryKey: ['departments'] });
  };

  const saveRenameDept = async (id: string, oldName: string) => {
    const name = editDeptName.trim();
    if (!name || name === oldName) {
      setEditingDeptId(null);
      return;
    }
    const { error } = await (supabase.from('departments' as any).update({ name } as any).eq('id', id));
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Departamento renomeado');
    setEditingDeptId(null);
    qc.invalidateQueries({ queryKey: ['departments'] });
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  const handleDeleteDept = async () => {
    if (!deleteDept) return;
    const { error } = await (supabase.from('departments' as any).delete().eq('id', deleteDept.id));
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Departamento removido');
    if (selectedDeptId === deleteDept.id) {
      setSelectedDeptId(null);
      setSelectedCatId(null);
    }
    setDeleteDept(null);
    qc.invalidateQueries({ queryKey: ['departments'] });
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  /* ---------------- Categories ---------------- */
  const createCat = async () => {
    const name = newCat.trim();
    if (!name || !selectedDept) return;
    const { error } = await supabase.from('categories').insert({
      name,
      department_id: selectedDept.id,
    } as any);
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Categoria criada');
    setNewCat('');
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveRenameCat = async (id: string, oldName: string) => {
    const name = editCatName.trim();
    if (!name || name === oldName) {
      setEditingCatId(null);
      return;
    }
    const { error: e1 } = await supabase.from('categories').update({ name } as any).eq('id', id);
    if (e1) return toast.error('Erro: ' + e1.message);
    await supabase.from('products').update({ category: name }).eq('category', oldName);
    toast.success('Categoria renomeada');
    setEditingCatId(null);
    qc.invalidateQueries({ queryKey: ['categories'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  const handleDeleteCat = async () => {
    if (!deleteCat) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteCat.id);
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Categoria removida');
    if (selectedCatId === deleteCat.id) setSelectedCatId(null);
    setDeleteCat(null);
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  const moveCategoryToDept = async (catId: string, deptId: string) => {
    const { error } = await supabase
      .from('categories')
      .update({ department_id: deptId } as any)
      .eq('id', catId);
    if (error) return toast.error('Erro ao mover: ' + error.message);
    toast.success('Categoria movida');
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  /* ---------------- Subcategories ---------------- */
  const createSub = async () => {
    const name = newSub.trim();
    if (!name || !selectedCat) return;
    const { error } = await supabase.from('subcategories' as any).insert({
      name,
      category_id: selectedCat.id,
    } as any);
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
    await supabase.from('products').update({ subcategory: name })
      .eq('category', selectedCat.name).eq('subcategory', oldName);
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
          Departamentos, Categorias & Subcategorias
        </h1>
        <p className="text-muted-foreground">Estrutura de três níveis do catálogo. Clique para navegar entre os níveis.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ----------- DEPARTMENTS ----------- */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Departamentos</CardTitle>
              <Badge variant="outline">{departments.length}</Badge>
            </div>
            <CardDescription>Ex: Masculino, Feminino, Unissex.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Novo departamento..." value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createDept()} />
              <Button onClick={createDept} disabled={!newDept.trim()}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Buscar..." value={searchDept} onChange={(e) => setSearchDept(e.target.value)} />
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {depsLoading && <Loader2 className="h-5 w-5 animate-spin mx-auto" />}
              {!depsLoading && filteredDepts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum departamento.</p>
              )}
              {filteredDepts.map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg border p-3 transition-all cursor-pointer',
                    selectedDeptId === d.id ? 'border-primary bg-accent/50 shadow-sm' : 'hover:bg-accent/30',
                  )}
                  onClick={() => editingDeptId !== d.id && (setSelectedDeptId(d.id), setSelectedCatId(null))}
                >
                  {editingDeptId === d.id ? (
                    <>
                      <Input value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveRenameDept(d.id, d.name); if (e.key === 'Escape') setEditingDeptId(null); }}
                        onClick={(e) => e.stopPropagation()} />
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); saveRenameDept(d.id, d.name); }}><Save className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingDeptId(null); }}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><Tags className="h-3 w-3" /> {deptCategoryCount(d.id)} categorias</span>
                          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">/c/{d.slug}</code>
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); setEditingDeptId(d.id); setEditDeptName(d.name); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteDept({ id: d.id, name: d.name, count: deptCategoryCount(d.id) }); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ----------- CATEGORIES ----------- */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5 text-primary" /> Categorias</CardTitle>
              {selectedDept && <Badge variant="outline">{deptCategories.length}</Badge>}
            </div>
            <CardDescription>
              {selectedDept ? <>Categorias de <strong>{selectedDept.name}</strong></> : 'Selecione um departamento à esquerda.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedDept ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Selecione um departamento.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input placeholder="Nova categoria..." value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createCat()} />
                  <Button onClick={createCat} disabled={!newCat.trim()}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="Buscar..." value={searchCat} onChange={(e) => setSearchCat(e.target.value)} />
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {catsLoading && <Loader2 className="h-5 w-5 animate-spin mx-auto" />}
                  {!catsLoading && filteredCats.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma categoria.</p>
                  )}
                  {filteredCats.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        'group flex items-center gap-2 rounded-lg border p-3 transition-all cursor-pointer',
                        selectedCatId === c.id ? 'border-primary bg-accent/50 shadow-sm' : 'hover:bg-accent/30',
                      )}
                      onClick={() => editingCatId !== c.id && setSelectedCatId(c.id)}
                    >
                      {editingCatId === c.id ? (
                        <>
                          <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') saveRenameCat(c.id, c.name); if (e.key === 'Escape') setEditingCatId(null); }}
                            onClick={(e) => e.stopPropagation()} />
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); saveRenameCat(c.id, c.name); }}><Save className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingCatId(null); }}><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {c.product_count}</span>
                              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">/c/{selectedDept.slug}/{c.slug}</code>
                            </p>
                          </div>
                          <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); setEditingCatId(c.id); setEditCatName(c.name); }}>
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
              </>
            )}
          </CardContent>
        </Card>

        {/* ----------- SUBCATEGORIES ----------- */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5 text-primary" /> Subcategorias</CardTitle>
              {selectedCat && <Badge variant="outline">{subs.length}</Badge>}
            </div>
            <CardDescription>
              {selectedCat ? <>Subcategorias de <strong>{selectedCat.name}</strong></> : 'Selecione uma categoria.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedCat ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderTree className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Selecione uma categoria.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input placeholder="Nova subcategoria..." value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
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
                            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {s.product_count}</span>
                              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">/{s.slug}</code>
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

      <AlertDialog open={!!deleteDept} onOpenChange={(o) => !o && setDeleteDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir departamento "{deleteDept?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDept && deleteDept.count > 0
                ? `Este departamento possui ${deleteDept.count} categoria(s). As categorias permanecerão, mas ficarão sem departamento vinculado.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDept} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCat} onOpenChange={(o) => !o && setDeleteCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria "{deleteCat?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCat && deleteCat.count > 0
                ? `Esta categoria possui ${deleteCat.count} produto(s). Eles permanecerão no catálogo.`
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
