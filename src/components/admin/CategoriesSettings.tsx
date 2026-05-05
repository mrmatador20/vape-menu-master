import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tags, Loader2, Save, Trash2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
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

export default function CategoriesSettings() {
  const { data: products, isLoading } = useProducts();
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (isLoading || !products) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
  const counts: Record<string, number> = {};
  products.forEach((p) => {
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  });

  const handleRename = async (oldName: string) => {
    const newName = (edits[oldName] ?? oldName).trim();
    if (!newName || newName === oldName) {
      toast.info('Nada para alterar');
      return;
    }
    setSaving(oldName);
    const { error } = await supabase
      .from('products')
      .update({ category: newName })
      .eq('category', oldName);
    setSaving(null);
    if (error) {
      toast.error('Erro ao renomear: ' + error.message);
      return;
    }
    toast.success(`Categoria renomeada para "${newName}"`);
    setEdits((e) => {
      const { [oldName]: _, ...rest } = e;
      return rest;
    });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleDelete = async (name: string) => {
    const { error } = await supabase.from('products').delete().eq('category', name);
    setDeleting(null);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    toast.success(`Categoria "${name}" e seus produtos foram removidos`);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-primary" />
          <CardTitle>Categorias dos Produtos</CardTitle>
        </div>
        <CardDescription>
          Renomeie ou remova categorias. Renomear atualiza todos os produtos da categoria de uma vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
        )}
        {categories.map((cat) => (
          <div key={cat} className="flex flex-col sm:flex-row gap-2 sm:items-center border rounded-lg p-3">
            <div className="flex-1 space-y-1">
              <Input
                value={edits[cat] ?? cat}
                onChange={(e) => setEdits({ ...edits, [cat]: e.target.value })}
                placeholder="Nome da categoria"
              />
              <p className="text-xs text-muted-foreground">
                {counts[cat]} produto{counts[cat] === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleRename(cat)}
                disabled={saving === cat || !(edits[cat] && edits[cat].trim() && edits[cat].trim() !== cat)}
              >
                {saving === cat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Save className="h-4 w-4 mr-1" />Salvar</>
                )}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleting(cat)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria "{deleting}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai apagar TODOS os produtos desta categoria ({deleting && counts[deleting]}).
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && handleDelete(deleting)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
