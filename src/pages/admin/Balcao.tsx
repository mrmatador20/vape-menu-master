import { useMemo, useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useBalcaoRole } from '@/hooks/useUserRole';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, PackageMinus, Lock } from 'lucide-react';
import { BalcaoBaixaDialog } from '@/components/admin/BalcaoBaixaDialog';
import { RecentBalcaoMovements } from '@/components/admin/RecentBalcaoMovements';
import type { Product } from '@/context/CartContext';

const stockStatus = (p: Product) => {
  if (p.stock <= 0) return { label: 'Sem estoque', variant: 'destructive' as const };
  if (p.stock <= (p.min_stock || 10)) return { label: 'Estoque baixo', variant: 'secondary' as const };
  return { label: 'Em estoque', variant: 'default' as const };
};

export default function Balcao() {
  const { data: products = [], isLoading } = useProducts();
  const { canBaixa, isLoading: roleLoading } = useBalcaoRole();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [selected, setSelected] = useState<Product | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (search) {
        const s = search.toLowerCase();
        if (!p.name.toLowerCase().includes(s) && !(p.sku ?? '').toLowerCase().includes(s)) return false;
      }
      if (category !== 'all' && p.category !== category) return false;
      if (status !== 'all') {
        const st = stockStatus(p).label;
        if (status === 'in' && st !== 'Em estoque') return false;
        if (status === 'low' && st !== 'Estoque baixo') return false;
        if (status === 'out' && st !== 'Sem estoque') return false;
      }
      return true;
    });
  }, [products, search, category, status]);

  if (roleLoading) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  if (!canBaixa) {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-3">
        <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Você precisa ter o papel <strong>operador</strong>, <strong>admin</strong> ou <strong>super_admin</strong> para usar o Balcão.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Balcão</h1>
          <p className="text-sm text-muted-foreground">Registre vendas e baixas da loja física.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="md:w-56"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="in">Em estoque</SelectItem>
              <SelectItem value="low">Estoque baixo</SelectItem>
              <SelectItem value="out">Sem estoque</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground">Carregando produtos…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((p) => {
            const st = stockStatus(p);
            return (
              <Card key={p.id} className="overflow-hidden flex flex-col">
                <div className="aspect-square bg-muted">
                  {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : null}
                </div>
                <CardContent className="p-3 flex-1 flex flex-col gap-2">
                  <div className="font-medium line-clamp-2">{p.name}</div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {p.sku && <div>SKU: <span className="font-mono">{p.sku}</span></div>}
                    <div>{p.category}{p.subcategory ? ` • ${p.subcategory}` : ''}</div>
                    <div>R$ {p.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="text-sm">
                      Estoque: <strong>{p.stock}</strong>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  <Button size="sm" className="w-full" disabled={p.stock <= 0} onClick={() => setSelected(p)}>
                    <PackageMinus className="h-4 w-4 mr-1" /> Dar Baixa
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">Nenhum produto encontrado.</div>
          )}
        </div>
      )}

      <BalcaoBaixaDialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)} product={selected} />
    </div>
  );
}
