import { useMemo, useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubcategories } from "@/hooks/useSubcategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Edit, Trash2, AlertTriangle, Loader2, Eye, EyeOff,
  Package, PackageX, PackageCheck, BadgePercent, ChevronLeft, ChevronRight, Tags,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate, Link } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ProductFormDialog } from "@/components/admin/ProductFormDialog";
import { Product } from "@/context/CartContext";

const PAGE_SIZE = 20;

export default function AdminProducts() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [subFilter, setSubFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [promoFilter, setPromoFilter] = useState<string>("all");
  const [visFilter, setVisFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: products, isLoading } = useProducts();
  const { data: departments = [] } = useDepartments();
  const { data: categories = [] } = useCategories();
  const visibleCategories = deptFilter === "all"
    ? categories
    : categories.filter((c) => c.department_id === deptFilter);
  const categoryNamesInDept = new Set(visibleCategories.map((c) => c.name));
  const selectedCat = categories.find((c) => c.name === catFilter);
  const { data: subs = [] } = useSubcategories(selectedCat?.id, selectedCat?.name);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      if (deptFilter !== "all" && !categoryNamesInDept.has(p.category)) return false;
      if (catFilter !== "all" && p.category !== catFilter) return false;
      if (subFilter !== "all" && (p as any).subcategory !== subFilter) return false;
      if (stockFilter === "in" && p.stock <= 0) return false;
      if (stockFilter === "low" && (p.stock === 0 || p.stock > p.min_stock)) return false;
      if (stockFilter === "out" && p.stock > 0) return false;
      const hasDiscount = ((p as any).discount_value || 0) > 0;
      if (promoFilter === "with" && !hasDiscount) return false;
      if (promoFilter === "without" && hasDiscount) return false;
      const visible = (p as any).visible_in_all !== false;
      if (visFilter === "visible" && !visible) return false;
      if (visFilter === "hidden" && visible) return false;
      return true;
    });
  }, [products, search, deptFilter, catFilter, subFilter, stockFilter, promoFilter, visFilter, categoryNamesInDept]);

  const stats = useMemo(() => {
    const list = products || [];
    return {
      total: list.length,
      inStock: list.filter((p) => p.stock > 0).length,
      low: list.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length,
      out: list.filter((p) => p.stock === 0).length,
      promo: list.filter((p) => ((p as any).discount_value || 0) > 0).length,
    };
  }, [products]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (role !== 'admin') return <Navigate to="/" replace />;

  const handleDelete = async () => {
    if (!deleteProductId) return;
    const { error } = await supabase.from('products').delete().eq('id', deleteProductId);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Produto excluído", description: "Removido com sucesso." });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
    setDeleteProductId(null);
  };

  const handleToggleVisibility = async (productId: string, visible: boolean) => {
    const { error } = await supabase.from('products').update({ visible_in_all: visible }).eq('id', productId);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const stockBadge = (stock: number, minStock: number) => {
    if (stock === 0) return <Badge variant="destructive">Esgotado</Badge>;
    if (stock <= minStock) return <Badge variant="outline" className="text-orange-500 border-orange-500">Baixo</Badge>;
    return <Badge variant="outline" className="text-emerald-600 border-emerald-600">Em estoque</Badge>;
  };

  const resetFilters = () => {
    setSearch(""); setDeptFilter("all"); setCatFilter("all"); setSubFilter("all");
    setStockFilter("all"); setPromoFilter("all"); setVisFilter("all"); setPage(1);
  };

  const KPI = ({ icon: Icon, label, value, tone }: any) => (
    <Card className="border-border/60">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${tone}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">Gestão completa do catálogo Fox Velour.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/546498@18/categories"><Tags className="h-4 w-4 mr-2" />Categorias</Link></Button>
          <Button onClick={() => { setEditProduct(null); setIsFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo produto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI icon={Package} label="Total" value={stats.total} tone="bg-primary/10 text-primary" />
        <KPI icon={PackageCheck} label="Em estoque" value={stats.inStock} tone="bg-emerald-500/10 text-emerald-600" />
        <KPI icon={AlertTriangle} label="Estoque baixo" value={stats.low} tone="bg-orange-500/10 text-orange-600" />
        <KPI icon={PackageX} label="Esgotados" value={stats.out} tone="bg-destructive/10 text-destructive" />
        <KPI icon={BadgePercent} label="Em promoção" value={stats.promo} tone="bg-amber-500/10 text-amber-600" />
      </div>

      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Buscar por nome ou categoria..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setCatFilter("all"); setSubFilter("all"); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos departamentos</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={catFilter} onValueChange={(v) => { setCatFilter(v); setSubFilter("all"); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {visibleCategories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={subFilter} onValueChange={(v) => { setSubFilter(v); setPage(1); }} disabled={catFilter === "all"}>
              <SelectTrigger><SelectValue placeholder="Subcategoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas subcategorias</SelectItem>
                {subs.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Estoque" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estoques</SelectItem>
                <SelectItem value="in">Em estoque</SelectItem>
                <SelectItem value="low">Estoque baixo</SelectItem>
                <SelectItem value="out">Esgotados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={promoFilter} onValueChange={(v) => { setPromoFilter(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Promoção" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with">Com promoção</SelectItem>
                <SelectItem value="without">Sem promoção</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visFilter} onValueChange={(v) => { setVisFilter(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Visibilidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="visible">Visíveis em Todos</SelectItem>
                <SelectItem value="hidden">Ocultos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filtered.length} resultado(s)</span>
            <Button variant="ghost" size="sm" onClick={resetFilters}>Limpar filtros</Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Cards responsivo (mobile + desktop) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : pageData.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">Nenhum produto encontrado.</p>
        ) : (
          pageData.map((product) => {
            const visible = (product as any).visible_in_all !== false;
            const discount = (product as any).discount_value || 0;
            return (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-3 space-y-3">
                  {/* Topo: foto + nome + categoria */}
                  <div className="flex items-start gap-3">
                    <img
                      src={product.image || '/placeholder.svg'}
                      alt={product.name}
                      className="h-16 w-16 rounded-md object-cover border shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {product.category}{(product as any).subcategory ? ` · ${(product as any).subcategory}` : ''}
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-medium text-sm">R$ {product.price.toFixed(2)}</span>
                        {discount > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            -{discount}{(product as any).discount_type === 'fixed' ? '' : '%'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Meio: status + visibilidade */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Estoque:</span>
                      <span className="font-medium text-sm">{product.stock}</span>
                      {stockBadge(product.stock, product.min_stock)}
                    </div>
                    <div className="flex items-center gap-2">
                      {visible
                        ? <Eye className="h-4 w-4 text-emerald-600" />
                        : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      <Switch
                        checked={visible}
                        onCheckedChange={(c) => handleToggleVisibility(product.id, c)}
                        aria-label="Visibilidade"
                      />
                    </div>
                  </div>

                  {/* Rodapé: ações */}
                  <div className="flex gap-2 pt-1 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10"
                      onClick={() => { setEditProduct(product); setIsFormOpen(true); }}
                    >
                      <Edit className="h-4 w-4 mr-1.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 text-destructive hover:text-destructive"
                      onClick={() => setDeleteProductId(product.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>


      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ProductFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} product={editProduct} />

      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
