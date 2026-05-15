import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, Trophy, TrendingUp, Tag, Receipt, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUserRole } from '@/hooks/useUserRole';
import { useInfluencerMetrics } from '@/hooks/useInfluencerMetrics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function InfluencerMetrics() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);

  const { data, isLoading } = useInfluencerMetrics({ from, to });

  const baseUrl = useMemo(() => window.location.origin, []);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (role !== 'admin') return <Navigate to="/" replace />;

  const copyLink = (code: string) => {
    const url = `${baseUrl}/?cupom=${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de indicação copiado!');
  };

  const clearDates = () => {
    setFrom(null);
    setTo(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Métricas de Cupons de Parceiros</h1>
          <p className="text-muted-foreground">
            Rastreio de vendas geradas por cupons de influencers
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(!from && 'text-muted-foreground')}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {from ? format(from, "dd 'de' MMM yyyy", { locale: ptBR }) : 'Data inicial'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={from ?? undefined} onSelect={(d) => setFrom(d ?? null)} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(!to && 'text-muted-foreground')}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {to ? format(to, "dd 'de' MMM yyyy", { locale: ptBR }) : 'Data final'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={to ?? undefined} onSelect={(d) => setTo(d ?? null)} />
            </PopoverContent>
          </Popover>

          {(from || to) && (
            <Button variant="ghost" onClick={clearDates}>Limpar</Button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Vendas via cupom</CardDescription>
            <CardTitle className="text-2xl">{data?.totals.totalSales ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Receita total</CardDescription>
            <CardTitle className="text-2xl">{formatBRL(data?.totals.totalRevenue ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Tag className="h-4 w-4" /> Descontos concedidos</CardDescription>
            <CardTitle className="text-2xl">{formatBRL(data?.totals.totalDiscount ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Trophy className="h-4 w-4" /> Cupons ativos</CardDescription>
            <CardTitle className="text-2xl">{data?.totals.activeCoupons ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Cupons</CardTitle>
          <CardDescription>Ordenado por valor total vendido</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !data?.summaries.length ? (
            <p className="text-center text-muted-foreground py-12">
              Nenhuma venda registrada {from || to ? 'no período selecionado' : 'ainda'}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Cupom</TableHead>
                  <TableHead>Influencer</TableHead>
                  <TableHead className="text-right">Usos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Descontos</TableHead>
                  <TableHead>Última venda</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.summaries.map((s, idx) => (
                  <TableRow key={s.discount_id}>
                    <TableCell>
                      {idx === 0 ? (
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <span className="text-muted-foreground text-sm">{idx + 1}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{s.coupon_code}</TableCell>
                    <TableCell>
                      {s.influencer_name ? (
                        <Badge variant="secondary">{s.influencer_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{s.total_uses}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatBRL(s.total_revenue)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatBRL(s.total_discount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.last_sale_at
                        ? format(new Date(s.last_sale_at), "dd/MM/yy HH:mm", { locale: ptBR })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => copyLink(s.coupon_code)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
