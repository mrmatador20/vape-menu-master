import { useStockMovements, useBalcaoReverter, type StockMovement } from '@/hooks/useBalcao';
import { useBalcaoRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const typeLabel: Record<string, string> = {
  baixa_manual: 'Baixa Manual',
  venda_loja_fisica: 'Venda Loja Física',
  reversao: 'Reversão',
  entrada: 'Entrada',
  ajuste_manual: 'Ajuste Manual',
  venda_online: 'Venda Online',
};

export function RecentBalcaoMovements() {
  const { canReverter } = useBalcaoRole();
  const { data: movements = [], isLoading, refetch } = useStockMovements({ limit: 10 });
  const reverter = useBalcaoReverter();

  const onDesfazer = async (m: StockMovement) => {
    if (!confirm(`Desfazer a baixa de ${m.quantity} un. de "${m.product_name_snapshot}"? O estoque será devolvido.`)) return;
    try {
      await reverter.mutateAsync({ movement_id: m.id, request_id: crypto.randomUUID() });
      toast.success('Baixa desfeita e estoque devolvido');
      refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao desfazer a baixa');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Últimas movimentações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : movements.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma movimentação registrada ainda.</div>
        ) : movements.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2 justify-between border-b last:border-0 pb-2 last:pb-0">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{m.product_name_snapshot}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(m.created_at).toLocaleString('pt-BR')} • {typeLabel[m.movement_type] ?? m.movement_type} • {m.quantity} un. • {m.stock_before} → {m.stock_after}
              </div>
            </div>
            {m.reversed_by_movement_id ? (
              <Badge variant="outline">Desfeita</Badge>
            ) : m.movement_type === 'reversao' ? (
              <Badge variant="secondary">Reversão</Badge>
            ) : canReverter ? (
              <Button size="sm" variant="outline" onClick={() => onDesfazer(m)} disabled={reverter.isPending}>
                <RotateCcw className="h-4 w-4 mr-1" /> Desfazer
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
