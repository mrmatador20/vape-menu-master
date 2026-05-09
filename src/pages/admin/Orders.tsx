import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Trash2, Copy, Eye, Truck, CheckCircle2, Clock, Package,
  XCircle, DollarSign, ShoppingBag, CalendarDays, Search, Printer,
  MessageCircle, ArrowUpDown, ChevronLeft, ChevronRight, MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  pending_payment: "Aguardando pagamento",
  confirmed: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_STYLES: Record<string, { cls: string; icon: any }> = {
  pending: { cls: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300", icon: Clock },
  pending_payment: { cls: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300", icon: Clock },
  confirmed: { cls: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300", icon: CheckCircle2 },
  shipped: { cls: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300", icon: Truck },
  delivered: { cls: "bg-primary/15 text-primary border-primary/30", icon: Package },
  cancelled: { cls: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300", icon: XCircle },
};

const PAGE_SIZE = 10;

export default function AdminOrders() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [detailOrder, setDetailOrder] = useState<any | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items(*, products(name, image, images))`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: role === 'admin',
  });

  const formatAddress = (o: any) => {
    const parts = [
      `${o.address_street}, ${o.address_number}`,
      o.address_complement || null,
      o.address_neighborhood,
      `${o.address_city}${o.address_state ? '/' + o.address_state : ''}`,
      o.cep ? `CEP ${o.cep}` : null,
    ].filter(Boolean);
    return parts.join(' - ');
  };

  const copyAddress = (o: any) => {
    navigator.clipboard.writeText(formatAddress(o));
    toast({ title: "Endereço copiado!", description: "Pronto para colar." });
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders?.find(o => o.id === orderId);
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
      return;
    }
    if (newStatus === 'delivered' && order) {
      try {
        const { data: userData } = await supabase.from('profiles').select('full_name').eq('id', order.user_id).single();
        const orderItems = order.order_items?.map((item: any) => ({ name: item.products?.name || 'Produto', quantity: item.quantity })) || [];
        await supabase.functions.invoke('notify-delivery-review', {
          body: { orderId: order.id, userId: order.user_id, userName: userData?.full_name, orderItems },
        });
      } catch (e) { console.error(e); }
    }
    toast({ title: "Status atualizado", description: STATUS_LABELS[newStatus] || newStatus });
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) {
      toast({ title: "Erro ao excluir pedido", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pedido excluído" });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    }
  };

  const openWhatsApp = (phone?: string, orderId?: string) => {
    if (!phone) return toast({ title: "Sem telefone", variant: "destructive" });
    const clean = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Sobre seu pedido #${orderId?.slice(0, 8)} na Fox Velour:`);
    window.open(`https://wa.me/55${clean}?text=${msg}`, '_blank');
  };

  const printOrder = (o: any) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const items = o.order_items?.map((i: any) => `<li>${i.quantity}x ${i.products?.name || 'Produto'}${i.flavor ? ` (${i.flavor})` : ''} - R$ ${Number(i.price).toFixed(2)}</li>`).join('') || '';
    w.document.write(`
      <html><head><title>Pedido #${o.id.slice(0, 8)}</title>
      <style>body{font-family:system-ui;padding:32px;color:#222}h1{border-bottom:2px solid #b8862b;padding-bottom:8px}strong{color:#444}</style>
      </head><body>
      <h1>Fox Velour - Pedido #${o.id.slice(0, 8)}</h1>
      <p><strong>Data:</strong> ${new Date(o.created_at).toLocaleString('pt-BR')}</p>
      <p><strong>Cliente:</strong> ${o.customer_name || '—'} - ${o.customer_phone || '—'}</p>
      <p><strong>Endereço:</strong> ${formatAddress(o)}</p>
      <h3>Itens:</h3><ul>${items}</ul>
      <p><strong>Frete:</strong> R$ ${Number(o.shipping_cost || 0).toFixed(2)}</p>
      <p><strong>Pagamento:</strong> ${o.payment_method}</p>
      <h2>Total: R$ ${Number(o.total_amount).toFixed(2)}</h2>
      </body></html>`);
    w.document.close();
    w.print();
  };

  // KPIs
  const kpis = useMemo(() => {
    const list = orders || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayCount = list.filter(o => new Date(o.created_at!) >= today).length;
    return {
      total: list.length,
      pending: list.filter(o => o.status === 'pending' || o.status === 'pending_payment').length,
      paid: list.filter(o => o.status === 'confirmed').length,
      shipped: list.filter(o => o.status === 'shipped').length,
      revenue: list.filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status)).reduce((s, o) => s + Number(o.total_amount || 0), 0),
      today: todayCount,
    };
  }, [orders]);

  // Filtering
  const filtered = useMemo(() => {
    let list = orders || [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (paymentFilter !== 'all') list = list.filter(o => o.payment_method === paymentFilter);
    if (dateFilter) list = list.filter(o => o.created_at?.startsWith(dateFilter));
    list = [...list].sort((a, b) => {
      const da = new Date(a.created_at!).getTime();
      const db = new Date(b.created_at!).getTime();
      return sortDesc ? db - da : da - db;
    });
    return list;
  }, [orders, search, statusFilter, paymentFilter, dateFilter, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (role !== 'admin') return <Navigate to="/" replace />;
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
    const Icon = s.icon;
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", s.cls)}>
        <Icon className="h-3 w-3" />
        {STATUS_LABELS[status] || status}
      </span>
    );
  };

  const paymentMethods = Array.from(new Set((orders || []).map(o => o.payment_method).filter(Boolean)));

  const kpiCards = [
    { label: "Total de Pedidos", value: kpis.total, icon: ShoppingBag, accent: "from-primary/20 to-primary/5", iconCls: "text-primary" },
    { label: "Pendentes", value: kpis.pending, icon: Clock, accent: "from-amber-500/20 to-amber-500/5", iconCls: "text-amber-600" },
    { label: "Pagos", value: kpis.paid, icon: CheckCircle2, accent: "from-emerald-500/20 to-emerald-500/5", iconCls: "text-emerald-600" },
    { label: "Enviados", value: kpis.shipped, icon: Truck, accent: "from-blue-500/20 to-blue-500/5", iconCls: "text-blue-600" },
    { label: "Receita Total", value: `R$ ${kpis.revenue.toFixed(2)}`, icon: DollarSign, accent: "from-primary/20 to-accent/5", iconCls: "text-primary" },
    { label: "Pedidos Hoje", value: kpis.today, icon: CalendarDays, accent: "from-foreground/10 to-foreground/5", iconCls: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Pedidos</h1>
        <p className="text-muted-foreground text-sm">Visualize, filtre e gerencie todos os pedidos da loja</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label} className={cn(
            "relative overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-all",
            "bg-gradient-to-br", k.accent
          )}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</p>
                  <p className="text-xl md:text-2xl font-bold mt-1 truncate">{k.value}</p>
                </div>
                <div className={cn("p-2 rounded-lg bg-background/60 backdrop-blur", k.iconCls)}>
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, telefone ou nº do pedido..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Pagamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pagamentos</SelectItem>
                {paymentMethods.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>{filtered.length} pedido(s) encontrado(s)</span>
            <Button variant="ghost" size="sm" onClick={() => setSortDesc(!sortDesc)} className="h-7">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              {sortDesc ? 'Mais recentes' : 'Mais antigos'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead className="font-semibold">Pedido</TableHead>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Endereço</TableHead>
                <TableHead className="font-semibold text-center">Itens</TableHead>
                <TableHead className="font-semibold">Total</TableHead>
                <TableHead className="font-semibold">Pagto</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    Nenhum pedido encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
              {pageData.map((order: any) => (
                <TableRow key={order.id} className="hover:bg-muted/30 transition-colors border-border/60">
                  <TableCell className="font-mono text-xs font-medium">#{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    <div>{new Date(order.created_at!).toLocaleDateString('pt-BR')}</div>
                    <div className="text-muted-foreground">{new Date(order.created_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{order.customer_name || <span className="text-muted-foreground italic">—</span>}</div>
                    <div className="text-xs text-muted-foreground">{order.customer_phone || '—'}</div>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="text-xs truncate">{order.address_city}/{order.address_state}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{order.address_street}, {order.address_number}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-normal">
                      {order.order_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-sm whitespace-nowrap">R$ {Number(order.total_amount).toFixed(2)}</TableCell>
                  <TableCell className="text-xs capitalize">{order.payment_method}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailOrder(order)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyAddress(order)} title="Copiar endereço">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => printOrder(order)} title="Imprimir">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" onClick={() => openWhatsApp(order.customer_phone, order.id)} title="WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Select value={order.status} onValueChange={(v) => handleStatusChange(order.id, v)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(order.id)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border/60">
            <span className="text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-2xl font-bold">Pedido #{detailOrder?.id.slice(0, 8)}</DialogTitle>
                <DialogDescription>
                  {detailOrder && new Date(detailOrder.created_at).toLocaleString('pt-BR')}
                </DialogDescription>
              </div>
              {detailOrder && <StatusBadge status={detailOrder.status} />}
            </div>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-5 text-sm">
              {/* Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cliente</p>
                  <p className="font-medium">{detailOrder.customer_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{detailOrder.customer_phone || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Endereço</p>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copyAddress(detailOrder)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs">{formatAddress(detailOrder)}</p>
                </div>
              </div>

              {/* Items with images */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">Itens do pedido</p>
                <div className="space-y-2">
                  {detailOrder.order_items?.map((item: any) => {
                    const img = item.products?.image || item.products?.images?.[0];
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card">
                        {img ? (
                          <img src={img} alt={item.products?.name} className="h-14 w-14 rounded-md object-cover border border-border/60" />
                        ) : (
                          <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.products?.name || 'Produto'}</p>
                          {item.flavor && <p className="text-xs text-muted-foreground">{item.flavor}</p>}
                          <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                        </div>
                        <p className="font-semibold whitespace-nowrap">R$ {(Number(item.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20">
                <div>
                  <p className="text-xs text-muted-foreground">Pagamento</p>
                  <p className="font-medium capitalize">{detailOrder.payment_method}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Frete</p>
                  <p className="font-medium">R$ {Number(detailOrder.shipping_cost || 0).toFixed(2)}</p>
                </div>
                <div className="col-span-2 pt-3 border-t border-primary/20 flex items-center justify-between">
                  <span className="text-sm font-medium">Total do pedido</span>
                  <span className="text-2xl font-bold text-primary">R$ {Number(detailOrder.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => printOrder(detailOrder)}>
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </Button>
                <Button variant="outline" size="sm" className="text-emerald-600" onClick={() => openWhatsApp(detailOrder.customer_phone, detailOrder.id)}>
                  <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
