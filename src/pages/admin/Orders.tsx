import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2, Trash2, Copy, Eye, Truck, CheckCircle2, Clock, Package,
  XCircle, DollarSign, ShoppingBag, CalendarDays, Search, Printer,
  MessageCircle, ArrowUpDown, ChevronLeft, ChevronRight, MapPin, Banknote, CircleDollarSign, Hourglass,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
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

// Logístico (operacional)
const LOGISTIC_LABELS: Record<string, string> = {
  pending: "Em separação",
  pending_payment: "Aguardando",
  confirmed: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const LOGISTIC_STYLES: Record<string, { cls: string; icon: any }> = {
  pending: { cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Clock },
  pending_payment: { cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Hourglass },
  confirmed: { cls: "bg-sky-50 text-sky-800 border-sky-200", icon: Package },
  shipped: { cls: "bg-blue-50 text-blue-800 border-blue-200", icon: Truck },
  delivered: { cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  cancelled: { cls: "bg-red-50 text-red-800 border-red-200", icon: XCircle },
};

// Financeiro (derivado de status + payment_method)
function financialStatus(o: any): { key: string; label: string; cls: string; icon: any } {
  if (o.status === 'cancelled') return { key: 'cancelled', label: 'Cancelado', cls: 'bg-red-50 text-red-800 border-red-200', icon: XCircle };
  if (['confirmed', 'shipped', 'delivered'].includes(o.status)) {
    return { key: 'paid', label: 'Pago', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 };
  }
  if (o.expires_at && new Date(o.expires_at) < new Date()) {
    return { key: 'expired', label: 'Expirado', cls: 'bg-zinc-100 text-zinc-700 border-zinc-200', icon: Hourglass };
  }
  if (o.payment_method === 'dinheiro') {
    return { key: 'on_delivery', label: 'Pagar na entrega', cls: 'bg-violet-50 text-violet-800 border-violet-200', icon: Banknote };
  }
  return { key: 'pending', label: 'Aguardando', cls: 'bg-amber-50 text-amber-800 border-amber-200', icon: Hourglass };
}

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
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    toast({ title: "Endereço copiado!" });
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

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from('orders').update({ status: newStatus }).in('id', ids);
    if (error) {
      toast({ title: "Erro na ação em massa", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${ids.length} pedido(s) atualizados`, description: STATUS_LABELS[newStatus] });
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja excluir este pedido?")) return;
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Pedido excluído" }); queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); }
  };

  const openWhatsApp = (phone?: string, orderId?: string) => {
    if (!phone) return toast({ title: "Sem telefone", variant: "destructive" });
    const clean = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Sobre seu pedido #${orderId?.slice(0, 8)} na Fox Velour:`);
    window.open(`https://wa.me/55${clean}?text=${msg}`, '_blank');
  };

  const renderShippingLabel = (o: any) => {
    const items = o.order_items || [];
    const totalQty = items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
    const subtotal = items.reduce((s: number, i: any) => s + Number(i.price) * Number(i.quantity || 0), 0);
    const itemsRows = items.map((i: any) => `
      <tr>
        <td>${i.products?.name || 'Produto'}${i.flavor ? ` <span style="color:#666">(${i.flavor})</span>` : ''}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">R$ ${Number(i.price).toFixed(2)}</td>
        <td style="text-align:right">R$ ${(Number(i.price) * Number(i.quantity)).toFixed(2)}</td>
      </tr>`).join('');
    return `
    <div class="label-page">
      <!-- ETIQUETA DE ENVIO -->
      <section class="card">
        <div class="head">
          <div>
            <div class="brand">FOX VELOUR</div>
            <div class="muted">Etiqueta de Envio</div>
          </div>
          <div class="order-id">#${o.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div class="grid">
          <div>
            <div class="lbl">REMETENTE</div>
            <strong>Fox Velour</strong><br/>
            <span class="muted">contato@foxvelour.com</span>
          </div>
          <div>
            <div class="lbl">DESTINATÁRIO</div>
            <strong>${o.customer_name || '—'}</strong><br/>
            ${o.address_street}, ${o.address_number}${o.address_complement ? ' - ' + o.address_complement : ''}<br/>
            ${o.address_neighborhood} - ${o.address_city}/${o.address_state || ''}<br/>
            <strong>CEP ${o.cep || '—'}</strong><br/>
            <span class="muted">Tel: ${o.customer_phone || '—'}</span>
          </div>
        </div>
      </section>

      <!-- DECLARAÇÃO DE CONTEÚDO -->
      <section class="card">
        <div class="head">
          <div class="brand small">DECLARAÇÃO DE CONTEÚDO</div>
          <div class="muted">${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <table>
          <thead>
            <tr><th>Item</th><th style="text-align:center">Qtd</th><th style="text-align:right">Vlr. Unit.</th><th style="text-align:right">Total</th></tr>
          </thead>
          <tbody>${itemsRows}</tbody>
          <tfoot>
            <tr><td colspan="3" style="text-align:right">Subtotal (${totalQty} itens)</td><td style="text-align:right">R$ ${subtotal.toFixed(2)}</td></tr>
            <tr><td colspan="3" style="text-align:right">Frete</td><td style="text-align:right">R$ ${Number(o.shipping_cost || 0).toFixed(2)}</td></tr>
            <tr class="grand"><td colspan="3" style="text-align:right">TOTAL</td><td style="text-align:right">R$ ${Number(o.total_amount).toFixed(2)}</td></tr>
          </tfoot>
        </table>
        <div class="footer-note">Pagamento: <strong>${o.payment_method}</strong> · Pedido: #${o.id.slice(0, 8)}</div>
      </section>
    </div>`;
  };

  const openPrintWindow = (htmlBody: string) => {
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) return;
    w.document.write(`
      <html><head><title>Etiquetas Fox Velour</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { font-family: Inter, system-ui, -apple-system, sans-serif; color: #111; margin: 0; padding: 0; }
        .label-page { page-break-after: always; padding: 0; }
        .label-page:last-child { page-break-after: auto; }
        .card { border: 1.5px solid #111; border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 10px; }
        .brand { font-size: 18px; font-weight: 800; letter-spacing: 2px; color: #b8862b; }
        .brand.small { font-size: 13px; letter-spacing: 1.5px; }
        .order-id { font-family: ui-monospace, Menlo, monospace; font-weight: 700; }
        .grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 16px; font-size: 13px; line-height: 1.5; }
        .lbl { font-size: 9px; letter-spacing: 1.5px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
        .muted { color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; padding: 6px 4px; border-bottom: 1.5px solid #111; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
        td { padding: 6px 4px; border-bottom: 1px solid #eee; vertical-align: top; }
        tfoot td { border-bottom: none; padding-top: 4px; font-size: 12px; }
        tfoot tr.grand td { border-top: 2px solid #111; padding-top: 8px; font-size: 14px; font-weight: 700; }
        .footer-note { margin-top: 8px; font-size: 10px; color: #666; text-align: right; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; } }
      </style>
      </head><body>${htmlBody}
      <script>window.onload = () => { setTimeout(() => window.print(), 200); };</script>
      </body></html>`);
    w.document.close();
  };

  const printOrder = (o: any) => openPrintWindow(renderShippingLabel(o));

  const printLabels = (selectedIds: string[]) => {
    const list = (orders || []).filter(o => selectedIds.includes(o.id));
    if (!list.length) return;
    openPrintWindow(list.map(renderShippingLabel).join(''));
  };

  // KPIs
  const kpis = useMemo(() => {
    const list = orders || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      total: list.length,
      pending: list.filter(o => o.status === 'pending' || o.status === 'pending_payment').length,
      paid: list.filter(o => o.status === 'confirmed').length,
      shipped: list.filter(o => o.status === 'shipped').length,
      revenue: list.filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status)).reduce((s, o) => s + Number(o.total_amount || 0), 0),
      today: list.filter(o => new Date(o.created_at!) >= today).length,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders || [];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(o => o.id.toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q) || (o.customer_phone || '').toLowerCase().includes(q));
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (paymentFilter !== 'all') list = list.filter(o => o.payment_method === paymentFilter);
    if (dateFilter) list = list.filter(o => o.created_at?.startsWith(dateFilter));
    return [...list].sort((a, b) => {
      const da = new Date(a.created_at!).getTime();
      const db = new Date(b.created_at!).getTime();
      return sortDesc ? db - da : da - db;
    });
  }, [orders, search, statusFilter, paymentFilter, dateFilter, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const togglePageAll = () => {
    const ids = pageData.map(o => o.id);
    const allSel = ids.every(id => selected.has(id));
    const next = new Set(selected);
    if (allSel) ids.forEach(id => next.delete(id));
    else ids.forEach(id => next.add(id));
    setSelected(next);
  };

  if (roleLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (role !== 'admin') return <Navigate to="/" replace />;
  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const LogisticBadge = ({ status }: { status: string }) => {
    const s = LOGISTIC_STYLES[status] || LOGISTIC_STYLES.pending;
    const Icon = s.icon;
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium", s.cls)}>
        <Icon className="h-3 w-3" />{LOGISTIC_LABELS[status] || status}
      </span>
    );
  };

  const FinancialBadge = ({ order }: { order: any }) => {
    const s = financialStatus(order);
    const Icon = s.icon;
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium", s.cls)}>
        <Icon className="h-3 w-3" />{s.label}
      </span>
    );
  };

  const paymentMethods = Array.from(new Set((orders || []).map(o => o.payment_method).filter(Boolean)));

  const kpiCards = [
    { label: "Total de Pedidos", value: kpis.total, icon: ShoppingBag },
    { label: "Pendentes", value: kpis.pending, icon: Clock },
    { label: "Pagos", value: kpis.paid, icon: CheckCircle2 },
    { label: "Enviados", value: kpis.shipped, icon: Truck },
    { label: "Receita Total", value: `R$ ${kpis.revenue.toFixed(2)}`, icon: DollarSign },
    { label: "Pedidos Hoje", value: kpis.today, icon: CalendarDays },
  ];

  const allPageSelected = pageData.length > 0 && pageData.every(o => selected.has(o.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Mesa de Operações</h1>
        <p className="text-muted-foreground text-sm">Gerencie pedidos, pagamentos e logística em um só lugar.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label} className="border-border/60 shadow-card-custom">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</p>
                  <p className="text-xl md:text-2xl font-bold mt-1 truncate">{k.value}</p>
                </div>
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 shadow-card-custom">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por cliente, telefone ou nº do pedido..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-primary/30 bg-primary/5">
          <div className="text-sm font-medium">
            {selected.size} pedido(s) selecionado(s)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select onValueChange={(v) => bulkUpdateStatus(v)}>
              <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Alterar status..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => printLabels(Array.from(selected))}>
              <Printer className="h-3 w-3 mr-2" /> Imprimir etiquetas
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar</Button>
          </div>
        </div>
      )}

      <Card className="border-border/60 shadow-card-custom overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead className="w-[40px]">
                  <Checkbox checked={allPageSelected} onCheckedChange={togglePageAll} />
                </TableHead>
                <TableHead className="font-semibold">Pedido</TableHead>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Endereço</TableHead>
                <TableHead className="font-semibold text-center">Itens</TableHead>
                <TableHead className="font-semibold">Total</TableHead>
                <TableHead className="font-semibold">Financeiro</TableHead>
                <TableHead className="font-semibold">Logística</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    Nenhum pedido encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
              {pageData.map((order: any) => {
                const isSel = selected.has(order.id);
                return (
                  <TableRow key={order.id} className={cn("hover:bg-muted/30 transition-colors border-border/60", isSel && "bg-primary/5")}>
                    <TableCell>
                      <Checkbox checked={isSel} onCheckedChange={(c) => {
                        const next = new Set(selected);
                        if (c) next.add(order.id); else next.delete(order.id);
                        setSelected(next);
                      }} />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">#{order.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <div>{new Date(order.created_at!).toLocaleDateString('pt-BR')}</div>
                      <div className="text-muted-foreground">{new Date(order.created_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{order.customer_name || <span className="text-muted-foreground italic">—</span>}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_phone || '—'}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
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
                    <TableCell>
                      <FinancialBadge order={order} />
                      <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{order.payment_method}</div>
                    </TableCell>
                    <TableCell><LogisticBadge status={order.status} /></TableCell>
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
                            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(order.id)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border/60">
            <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
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

      {/* Slide-over detail */}
      <Sheet open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="text-left">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div>
                <SheetTitle className="text-2xl font-bold">Pedido #{detailOrder?.id.slice(0, 8)}</SheetTitle>
                <SheetDescription>
                  {detailOrder && new Date(detailOrder.created_at).toLocaleString('pt-BR')}
                </SheetDescription>
              </div>
              {detailOrder && <div className="flex flex-col gap-1 items-end"><FinancialBadge order={detailOrder} /><LogisticBadge status={detailOrder.status} /></div>}
            </div>
          </SheetHeader>

          {detailOrder && (
            <div className="space-y-5 text-sm mt-6">
              {/* Timeline */}
              <div className="rounded-md border border-border/60 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 font-medium">Linha do tempo</p>
                <ol className="space-y-3">
                  {[
                    { key: 'created', label: 'Pedido criado', date: detailOrder.created_at, done: true },
                    { key: 'paid', label: 'Pagamento confirmado', date: null, done: ['confirmed', 'shipped', 'delivered'].includes(detailOrder.status) },
                    { key: 'shipped', label: 'Enviado', date: null, done: ['shipped', 'delivered'].includes(detailOrder.status) },
                    { key: 'delivered', label: 'Entregue', date: null, done: detailOrder.status === 'delivered' },
                  ].map((step, idx) => (
                    <li key={step.key} className="flex items-start gap-3">
                      <div className={cn("h-5 w-5 rounded-full flex items-center justify-center mt-0.5",
                        step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border")}>
                        {step.done ? <CheckCircle2 className="h-3 w-3" /> : <span className="text-[10px]">{idx + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <p className={cn("text-sm font-medium", !step.done && "text-muted-foreground")}>{step.label}</p>
                        {step.date && <p className="text-xs text-muted-foreground">{new Date(step.date).toLocaleString('pt-BR')}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-muted/40 border border-border/60">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cliente</p>
                  <p className="font-medium">{detailOrder.customer_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{detailOrder.customer_phone || '—'}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/40 border border-border/60">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Endereço</p>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copyAddress(detailOrder)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs">{formatAddress(detailOrder)}</p>
                </div>
              </div>

              {/* Pagamento */}
              <div className="rounded-md border border-border/60 p-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-2">
                  <CircleDollarSign className="h-3.5 w-3.5" /> Pagamento
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Método</p>
                    <p className="font-medium capitalize">{detailOrder.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status financeiro</p>
                    <FinancialBadge order={detailOrder} />
                  </div>
                  {detailOrder.expires_at && (
                    <div>
                      <p className="text-muted-foreground">Expira em</p>
                      <p className="font-medium">{new Date(detailOrder.expires_at).toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                  {detailOrder.change_amount != null && (
                    <div>
                      <p className="text-muted-foreground">Troco para</p>
                      <p className="font-medium">R$ {Number(detailOrder.change_amount).toFixed(2)}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-muted-foreground">ID da transação</p>
                    <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{detailOrder.id}</code>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">Itens do pedido</p>
                <div className="space-y-2">
                  {detailOrder.order_items?.map((item: any) => {
                    const img = item.products?.image || item.products?.images?.[0];
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-md border border-border/60 bg-card">
                        {img ? (
                          <img src={img} alt={item.products?.name} className="h-14 w-14 rounded-md object-cover border border-border/60" />
                        ) : (
                          <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
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

              {/* Total */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-md border border-primary/30 bg-primary/5">
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
        </SheetContent>
      </Sheet>
    </div>
  );
}
