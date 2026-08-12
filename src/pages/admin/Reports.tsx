import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, DollarSign, ShoppingBag, TrendingUp, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Period,
  useSalesAnalytics,
  useTopSold,
  useViewsVsSales,
} from '@/hooks/useAnalytics';
import { useBalcaoSales, type SalesChannelFilter as Channel } from '@/hooks/useBalcaoSales';
import { SalesChannelFilter } from '@/components/admin/SalesChannelFilter';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const formatBRL = (n: number) => `R$ ${n.toFixed(2)}`;

export default function AdminReports() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const [period, setPeriod] = useState<Period>(30);
  const [channel, setChannel] = useState<Channel>('all');
  const { data: sales, isLoading: salesLoading } = useSalesAnalytics(period);
  const { data: topSold } = useTopSold(period, 10);
  const { data: views } = useViewsVsSales(period);

  const fromIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - period);
    return d.toISOString();
  }, [period]);
  const { data: balcaoSales } = useBalcaoSales(fromIso);

  const merged = useMemo(() => {
    const bal = balcaoSales ?? [];
    const balRevenue = bal.reduce((s, m) => s + m.revenue, 0);
    const balCount = bal.length;

    const onlineRevenue = sales?.revenue ?? 0;
    const onlineCount = sales?.orderCount ?? 0;

    const revenue =
      channel === 'online' ? onlineRevenue : channel === 'balcao' ? balRevenue : onlineRevenue + balRevenue;
    const orderCount =
      channel === 'online' ? onlineCount : channel === 'balcao' ? balCount : onlineCount + balCount;

    const series = (sales?.series ?? []).map((p) => ({ ...p }));
    if (channel === 'balcao') series.forEach((p) => { p.revenue = 0; p.orders = 0; });
    if (channel !== 'online') {
      const byDay = new Map(series.map((p) => [p.date, p]));
      bal.forEach((m) => {
        const e = byDay.get((m.created_at || '').slice(0, 10));
        if (e) {
          e.revenue += m.revenue;
          e.orders += 1;
        }
      });
    }

    // Top produtos
    const map = new Map<string, { product_id: string; name: string; image?: string | null; qty: number }>();
    if (channel !== 'balcao') {
      (topSold ?? []).forEach((p) => map.set(p.product_id, { ...p }));
    }
    if (channel !== 'online') {
      bal.forEach((m) => {
        const key = m.product_id ?? `name:${m.product_name}`;
        const prev = map.get(key) || { product_id: key, name: m.product_name, image: null, qty: 0 };
        prev.qty += m.quantity;
        map.set(key, prev);
      });
    }
    const top = Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 10);

    return { revenue, orderCount, avgTicket: orderCount > 0 ? revenue / orderCount : 0, series, top };
  }, [sales, balcaoSales, topSold, channel]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (role !== 'admin') return <Navigate to="/" replace />;

  const kpis = [
    {
      label: 'Receita',
      value: formatBRL(merged.revenue),
      icon: DollarSign,
    },
    {
      label: 'Pedidos pagos',
      value: merged.orderCount,
      icon: ShoppingBag,
    },
    {
      label: 'Ticket médio',
      value: formatBRL(merged.avgTicket),
      icon: TrendingUp,
    },
    {
      label: 'Visualizações',
      value: (views || []).reduce((s, p) => s + p.views, 0),
      icon: Eye,
    },
  ];


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios de Performance</h1>
          <p className="text-muted-foreground text-sm">Acompanhe receita, ticket médio e conversão por produto.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SalesChannelFilter value={channel} onChange={setChannel} />
          <Tabs value={String(period)} onValueChange={(v) => setPeriod(Number(v) as Period)}>
            <TabsList>
              <TabsTrigger value="7">7 dias</TabsTrigger>
              <TabsTrigger value="30">30 dias</TabsTrigger>
              <TabsTrigger value="90">90 dias</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/60 shadow-card-custom">
            <CardContent className="p-4 flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</p>
                <p className="text-xl md:text-2xl font-bold mt-1 truncate">{k.value}</p>
              </div>
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <k.icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receita por dia</CardTitle>
          <CardDescription>Pedidos confirmados ou entregues nos últimos {period} dias.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          {salesLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sales?.series || []} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(value: any, name: any) => name === 'revenue' ? formatBRL(Number(value)) : value}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top produtos vendidos</CardTitle>
            <CardDescription>Ordenado por unidades vendidas no período.</CardDescription>
          </CardHeader>
          <CardContent>
            {!topSold || topSold.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma venda registrada.</p>
            ) : (
              <div className="space-y-3">
                {topSold.map((p, i) => (
                  <div key={p.product_id} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                    {p.image && <img src={p.image} alt={p.name} className="h-10 w-10 rounded object-cover" />}
                    <p className="flex-1 text-sm font-medium truncate">{p.name}</p>
                    <Badge variant="secondary">{p.qty} un.</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vistos vs. Vendidos</CardTitle>
            <CardDescription>Taxa de conversão = vendas ÷ visualizações.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!views || views.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma visualização registrada ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {views.slice(0, 15).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium truncate max-w-[180px]">{p.name}</TableCell>
                      <TableCell className="text-right">{p.views}</TableCell>
                      <TableCell className="text-right">{p.sold}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.conv >= 5 ? 'default' : p.conv > 0 ? 'secondary' : 'outline'}>
                          {p.conv.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
