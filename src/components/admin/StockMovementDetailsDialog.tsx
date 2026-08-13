import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { StockMovement } from '@/hooks/useBalcao';

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

interface Props {
  movement: StockMovement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm break-words">{children}</div>
    </div>
  );
}

export function StockMovementDetailsDialog({ movement, open, onOpenChange }: Props) {
  if (!movement) return null;
  const d = new Date(movement.created_at);
  const fullReason = [movement.reason, movement.notes].filter(Boolean).join('\n\n') || 'Nenhuma observação registrada.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">📋 Detalhes da Movimentação de Estoque</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Row label="Data e Hora">
            {d.toLocaleDateString('pt-BR')} às {d.toLocaleTimeString('pt-BR')}
          </Row>
          <Row label="Operador">
            <span className="break-all">{movement.user_email_snapshot ?? '—'}</span>
          </Row>
          <Row label="Produto">
            <span className="font-medium">{movement.product_name_snapshot}</span>
            <div className="font-mono text-xs text-muted-foreground break-all">
              SKU: {movement.product_sku_snapshot ?? '—'}
            </div>
          </Row>
          <Row label="Tipo">
            <Badge variant={typeVariant(movement.movement_type)}>
              {typeLabel[movement.movement_type] ?? movement.movement_type}
            </Badge>
          </Row>
          <Row label="Estoque">
            De <strong>{movement.stock_before}</strong> para <strong>{movement.stock_after}</strong> unidades
            <span className="text-muted-foreground"> ({movement.quantity} un.)</span>
          </Row>
          {movement.category_snapshot && <Row label="Categoria">{movement.category_snapshot}</Row>}
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Motivo / Observação completa</p>
          <div className="bg-muted/50 p-4 rounded-lg border text-sm whitespace-pre-wrap break-words">
            {fullReason}
          </div>
        </div>

        <p className="text-[10px] font-mono text-muted-foreground break-all">ID: {movement.id}</p>
      </DialogContent>
    </Dialog>
  );
}
