import { useMemo } from 'react';
import { useBalcaoDashboard } from '@/hooks/useBalcao';
import { useProducts } from '@/hooks/useProducts';
import { useBalcaoRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Lock } from 'lucide-react';

const isToday = (iso: string) => {
  const d = new Date(iso); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export default function BalcaoDashboard() {
  const { canSeeAllLogs, isLoading: roleLoading } = useBalcaoRole();
  const { data: movements = [], isLoading } = useBalcaoDashboard();
  const { data: products = [] } = useProducts();

  const today = movements.filter(m => m.created_at && isToday(m.created_at));
  const baixasHoje = today.filter(m => m.movement_type === 'baixa_manual' || m.movement_type === 'venda_loja_fisica').length;
  const reversaoHoje = today.filter(m => m.movement_type === 'reversao').length;
  const vendasFisicasHoje = today.filter(m => m.movement_type === 'venda_loja_fisica').length;
  const ajustesHoje = today.filter(m => m.movement_type === 'ajuste_manual').length;

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number }>();
    for (const m of movements) {
      const key = m.product_id ?? m.product_name_snapshot ?? 'unk';
      const cur = map.get(key) ?? { name: m.product_name_snapshot ?? '—', qty: 0 };
      cur.qty += m.quantity ?? 0;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [movements]);

  const topUsers = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movements) {
      if (!m.user_email_snapshot) continue;
      map.set(m.user_email_snapshot, (map.get(m.user_email_snapshot) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [movements]);

  const lowStock = useMemo(
    () => [...products].filter(p => p.stock <= (p.min_stock || 10)).sort((a, b) => a.stock - b.stock).slice(0, 10),
    [products],
  );

  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const m of movements) {
      const k = (m.created_at ?? '').slice(0, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([day, count]) => ({
      day: day.slice(5), count,
    }));
  }, [movements]);

  if (roleLoading) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  if (!canSeeAllLogs) {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-3">
        <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
      </div>
    );
  }

  const Kpi = ({ label, value }: { label: string; value: number | string }) => (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </CardContent></Card>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard do Balcão</h1>
        <p className="text-sm text-muted-foreground">Visão geral das movimentações.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Baixas hoje" value={baixasHoje} />
        <Kpi label="Reversões hoje" value={reversaoHoje} />
        <Kpi label="Vendas físicas hoje" value={vendasFisicasHoje} />
        <Kpi label="Ajustes hoje" value={ajustesHoje} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Movimentações (últimos 30 dias)</CardTitle></CardHeader>
        <CardContent className="h-64">
          {isLoading ? <div className="text-muted-foreground">Carregando…</div> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Top produtos movimentados</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {topProducts.map((p, i) => (
              <div key={i} className="flex justify-between border-b py-1 last:border-b-0">
                <span className="truncate pr-2">{p.name}</span>
                <span className="font-mono">{p.qty}</span>
              </div>
            ))}
            {topProducts.length === 0 && <div className="text-muted-foreground">Sem dados.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Produtos com menor estoque</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {lowStock.map(p => (
              <div key={p.id} className="flex justify-between border-b py-1 last:border-b-0">
                <span className="truncate pr-2">{p.name}</span>
                <span className="font-mono">{p.stock}</span>
              </div>
            ))}
            {lowStock.length === 0 && <div className="text-muted-foreground">Sem alertas.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Usuários mais ativos</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {topUsers.map(([email, qty]) => (
              <div key={email} className="flex justify-between border-b py-1 last:border-b-0">
                <span className="truncate pr-2">{email}</span>
                <span className="font-mono">{qty}</span>
              </div>
            ))}
            {topUsers.length === 0 && <div className="text-muted-foreground">Sem dados.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
