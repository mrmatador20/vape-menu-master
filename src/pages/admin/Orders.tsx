import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Copy, Eye, Truck, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  pending_payment: "Aguardando pagamento",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export default function AdminOrders() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [detailOrder, setDetailOrder] = useState<any | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items(*, products(name))`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: role === 'admin',
  });

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

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

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      pending_payment: "secondary",
      confirmed: "default",
      shipped: "default",
      delivered: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{STATUS_LABELS[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Pedidos</h1>
        <p className="text-muted-foreground">Visualize e gerencie todos os pedidos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Pedidos</CardTitle>
          <CardDescription>Lista completa de pedidos realizados</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">#{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">{new Date(order.created_at!).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{order.customer_name || <span className="text-muted-foreground italic">—</span>}</TableCell>
                  <TableCell className="text-xs">{order.customer_phone || '—'}</TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="flex items-start gap-1">
                      <span className="text-xs truncate">{formatAddress(order)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyAddress(order)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id}>{item.products?.name || 'Produto'} x{item.quantity}</div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">R$ {Number(order.total_amount).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{order.payment_method}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDetailOrder(order)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <Button variant="ghost" size="icon" onClick={() => handleStatusChange(order.id, 'shipped')} title="Marcar como enviado">
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <Button variant="ghost" size="icon" onClick={() => handleStatusChange(order.id, 'delivered')} title="Marcar como entregue">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Select value={order.status} onValueChange={(v) => handleStatusChange(order.id, v)}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(order.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pedido #{detailOrder?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>
              {detailOrder && new Date(detailOrder.created_at).toLocaleString('pt-BR')}
            </DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Cliente:</strong> {detailOrder.customer_name || '—'}</div>
                <div><strong>Telefone:</strong> {detailOrder.customer_phone || '—'}</div>
              </div>
              <div className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <strong>Endereço de Entrega</strong>
                  <Button size="sm" variant="outline" onClick={() => copyAddress(detailOrder)}>
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                </div>
                <p>{formatAddress(detailOrder)}</p>
              </div>
              <div>
                <strong>Itens:</strong>
                <ul className="list-disc pl-5 mt-1">
                  {detailOrder.order_items?.map((item: any) => (
                    <li key={item.id}>
                      {item.quantity}x {item.products?.name || 'Produto'}
                      {item.flavor && ` (${item.flavor})`} — R$ {Number(item.price).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Pagamento:</strong> {detailOrder.payment_method}</div>
                <div><strong>Status:</strong> {STATUS_LABELS[detailOrder.status] || detailOrder.status}</div>
                <div><strong>Frete:</strong> R$ {Number(detailOrder.shipping_cost || 0).toFixed(2)}</div>
                <div><strong>Total:</strong> R$ {Number(detailOrder.total_amount).toFixed(2)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
