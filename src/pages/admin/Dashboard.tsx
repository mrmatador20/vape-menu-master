import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, AlertCircle, DollarSign } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [productsRes, ordersRes, lowStockRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, total_amount', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }).lte('stock', 10),
      ]);

      const totalRevenue = ordersRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      return {
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        lowStockItems: lowStockRes.count || 0,
        totalRevenue,
      };
    },
  });

  const statCards = [
    {
      title: "Total de Produtos",
      value: stats?.totalProducts || 0,
      icon: Package,
      description: "Produtos cadastrados",
    },
    {
      title: "Pedidos Recebidos",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      description: "Total de pedidos",
    },
    {
      title: "Estoque Baixo",
      value: stats?.lowStockItems || 0,
      icon: AlertCircle,
      description: "Produtos com estoque ≤ 10",
      alert: (stats?.lowStockItems || 0) > 0,
    },
    {
      title: "Receita Total",
      value: `R$ ${(stats?.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      description: "Valor total em vendas",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu e-commerce</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.alert ? 'text-destructive' : ''}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
