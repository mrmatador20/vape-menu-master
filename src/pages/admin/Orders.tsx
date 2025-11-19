import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function AdminOrders() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            products(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      delivered: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    {order.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at!).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {order.user_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {order.address_street}, {order.address_number} - {order.address_neighborhood}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id}>
                          {item.products?.name} x{item.quantity}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    R$ {Number(order.total_amount).toFixed(2)}
                  </TableCell>
                  <TableCell>{order.payment_method}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
