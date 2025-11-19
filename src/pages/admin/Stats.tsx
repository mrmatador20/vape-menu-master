import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminStats() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['admin-sales-stats', dateFrom, dateTo],
    queryFn: async () => {
      // Vendas por mês
      let query = supabase
        .from('orders')
        .select('id, created_at, total_amount, status');

      // Aplicar filtro de data se definido
      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        // Adicionar 1 dia para incluir todo o dia final
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }

      const { data: orders } = await query;

      if (!orders) return null;

      // Filtrar apenas pedidos confirmados e entregues
      const completedOrders = orders.filter(order => 
        order.status === 'delivered' || order.status === 'confirmed'
      );

      // Agrupar vendas por mês (apenas pedidos confirmados/entregues)
      const salesByMonth = completedOrders.reduce((acc: any, order) => {
        const month = new Date(order.created_at!).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (!acc[month]) {
          acc[month] = { month, total: 0, count: 0 };
        }
        acc[month].total += Number(order.total_amount);
        acc[month].count += 1;
        return acc;
      }, {});

      // Vendas por status (todos os pedidos para visualização)
      const salesByStatus = orders.reduce((acc: any, order) => {
        if (!acc[order.status]) {
          acc[order.status] = { status: order.status, count: 0, total: 0 };
        }
        acc[order.status].count += 1;
        acc[order.status].total += Number(order.total_amount);
        return acc;
      }, {});

      // Produtos mais vendidos (apenas de pedidos confirmados/entregues)
      const completedOrderIds = completedOrders.map(order => order.id);
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, order_id, products(name)')
        .in('order_id', completedOrderIds);

      const topProducts = orderItems?.reduce((acc: any, item) => {
        const productName = item.products?.name || 'Unknown';
        if (!acc[productName]) {
          acc[productName] = { name: productName, quantity: 0 };
        }
        acc[productName].quantity += item.quantity;
        return acc;
      }, {});

      return {
        monthlyData: Object.values(salesByMonth).slice(-6),
        statusData: Object.values(salesByStatus),
        topProducts: Object.values(topProducts || {}).sort((a: any, b: any) => b.quantity - a.quantity).slice(0, 5),
        totalRevenue: completedOrders.reduce((sum, order) => sum + Number(order.total_amount), 0),
        totalOrders: completedOrders.length,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!salesData || salesData.totalOrders === 0) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Vendas</h1>
        <p className="text-muted-foreground">Visualize estatísticas e gráficos de vendas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Período</CardTitle>
          <CardDescription>Selecione o período para visualizar as estatísticas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="pointer-events-auto"
                    disabled={(date) => dateFrom ? date < dateFrom : false}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {(dateFrom || dateTo) && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <p className="text-xl font-semibold mb-2">Nenhum dado disponível</p>
            <p className="text-muted-foreground">
              Ainda não há pedidos para exibir estatísticas. Os gráficos aparecerão assim que houver vendas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  const monthlyChartConfig = {
    total: {
      label: "Total",
      color: "hsl(var(--primary))",
    },
  };

  const statusChartConfig = {
    count: {
      label: "Pedidos",
      color: "hsl(var(--primary))",
    },
  };

  const productsChartConfig = {
    quantity: {
      label: "Quantidade",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Vendas</h1>
        <p className="text-muted-foreground">Visualize estatísticas e gráficos de vendas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita Total</CardTitle>
            <CardDescription>Valor total de todas as vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {salesData?.totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total de Pedidos</CardTitle>
            <CardDescription>Número total de pedidos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{salesData?.totalOrders}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {salesData.monthlyData && salesData.monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Mês</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={monthlyChartConfig} className="h-[300px] w-full">
                <LineChart data={salesData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {salesData.statusData && salesData.statusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Status dos Pedidos</CardTitle>
              <CardDescription>Distribuição por status</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={statusChartConfig} className="h-[300px] w-full">
                <PieChart>
                  <Pie
                    data={salesData.statusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {salesData.statusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {salesData.topProducts && salesData.topProducts.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
              <CardDescription>Top 5 produtos por quantidade</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={productsChartConfig} className="h-[300px] w-full">
                <BarChart data={salesData.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
