import { useMemo, useState } from 'react';
import { useStockMovements, useBalcaoReverter, type StockMovement } from '@/hooks/useBalcao';
import { useBalcaoRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, RotateCcw, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { exportStockLogsCsv, exportStockLogsPdf, exportStockLogsXls } from '@/lib/exportStockLogs';

const typeLabel: Record<string, string> = {
  baixa_manual: 'Baixa Manual',
  venda_loja_fisica: 'Venda Loja Física',
  reversao: 'Reversão',
  entrada: 'Entrada',
  ajuste_manual: 'Ajuste Manual',
  venda_online: 'Venda Online',
};

const typeVariant = (t: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (t === 'reversao') return 'secondary';
  if (t === 'entrada' || t === 'ajuste_manual') return 'outline';
  if (t === 'venda_online') return 'default';
  return 'destructive';
};

export default function StockLogs() {
  const { canSeeAllLogs, canReverter, canExport, role, isLoading: roleLoading } = useBalcaoRole();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const filters = useMemo(() => ({
    search: search || undefined,
    type: type === 'all' ? undefined : type,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to + 'T23:59:59').toISOString() : undefined,
    userEmail: userEmail || undefined,
    limit: 1000,
  }), [search, type, from, to, userEmail]);

  const { data: movements = [], isLoading, refetch } = useStockMovements(filters);
  const reverter = useBalcaoReverter();

  const onReverter = async (m: StockMovement) => {
    if (!confirm(`Reverter movimentação #${m.id.slice(0, 8)} de "${m.product_name_snapshot}"?`)) return;
    try {
      await reverter.mutateAsync({ movement_id: m.id, request_id: crypto.randomUUID() });
      toast.success('Movimentação revertida');
      refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao reverter');
    }
  };

  if (roleLoading) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  if (role !== 'super_admin' && role !== 'admin' && role !== 'operador') {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-3">
        <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Logs de Estoque</h1>
          <p className="text-sm text-muted-foreground">
            {canSeeAllLogs ? 'Todas as movimentações registradas.' : 'Suas movimentações.'}
          </p>
        </div>
        {canExport && (
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex">
            <Button variant="outline" size="sm" onClick={() => exportStockLogsCsv(movements)}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportStockLogsXls(movements)}>
              <Download className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportStockLogsPdf(movements)}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar produto ou SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {Object.entries(typeLabel).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="De" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Até" />
          {canSeeAllLogs && (
            <Input className="md:col-span-5" placeholder="Filtrar por email do usuário…" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Antes</TableHead>
                <TableHead className="text-right">Depois</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-6">Carregando…</TableCell></TableRow>
              ) : movements.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Sem movimentações.</TableCell></TableRow>
              ) : movements.map((m) => (
                <TableRow key={m.id} className={m.reversed_by_movement_id ? 'opacity-60' : ''}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(m.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-xs">{m.user_email_snapshot ?? '—'}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{m.product_name_snapshot}</TableCell>
                  <TableCell className="font-mono text-xs">{m.product_sku_snapshot ?? '—'}</TableCell>
                  <TableCell><Badge variant={typeVariant(m.movement_type)}>{typeLabel[m.movement_type] ?? m.movement_type}</Badge></TableCell>
                  <TableCell className="text-right">{m.quantity}</TableCell>
                  <TableCell className="text-right">{m.stock_before}</TableCell>
                  <TableCell className="text-right">{m.stock_after}</TableCell>
                  <TableCell className="text-xs">{m.reason ?? '—'}{m.notes ? ` — ${m.notes}` : ''}</TableCell>
                  <TableCell>
                    {canReverter && !m.reversed_by_movement_id && m.movement_type !== 'reversao' && (
                      <Button size="sm" variant="ghost" onClick={() => onReverter(m)} disabled={reverter.isPending}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Reverter
                      </Button>
                    )}
                    {m.reversed_by_movement_id && <Badge variant="outline">Revertida</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
