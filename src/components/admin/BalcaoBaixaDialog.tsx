import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useBalcaoBaixa } from '@/hooks/useBalcao';
import { useFlavors } from '@/hooks/useFlavors';
import type { Product } from '@/context/CartContext';

type Reason = 'venda_loja' | 'produto_danificado' | 'troca' | 'ajuste_estoque' | 'outro';
const REASONS: { value: Reason; label: string }[] = [
  { value: 'venda_loja', label: 'Venda Loja Física' },
  { value: 'produto_danificado', label: 'Produto Danificado' },
  { value: 'troca', label: 'Troca' },
  { value: 'ajuste_estoque', label: 'Ajuste de Estoque' },
  { value: 'outro', label: 'Outro' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
}

export function BalcaoBaixaDialog({ open, onOpenChange, product }: Props) {
  const baixa = useBalcaoBaixa();
  const { data: flavors } = useFlavors(product?.id ?? '');
  const [flavorId, setFlavorId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<Reason>('venda_loja');
  const [notes, setNotes] = useState('');
  const [requestId, setRequestId] = useState<string>('');

  useEffect(() => {
    if (open) {
      setFlavorId('');
      setQuantity(1);
      setReason('venda_loja');
      setNotes('');
      setRequestId(crypto.randomUUID());
    }
  }, [open, product?.id]);

  const currentStock = useMemo(() => {
    if (flavorId && flavors) return flavors.find(f => f.id === flavorId)?.stock ?? 0;
    return product?.stock ?? 0;
  }, [flavorId, flavors, product]);

  if (!product) return null;

  const submit = async () => {
    if (!quantity || quantity < 1) return toast.error('Quantidade inválida');
    if (quantity > currentStock) return toast.error('Quantidade maior que o estoque');
    try {
      await baixa.mutateAsync({
        product_id: product.id,
        flavor_id: flavorId || null,
        quantity,
        movement_type: reason === 'venda_loja' ? 'venda_loja_fisica' : 'baixa_manual',
        reason,
        notes: notes.trim() || null,
        request_id: requestId,
      });
      toast.success('Baixa registrada com sucesso');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao registrar baixa');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dar Baixa no Estoque</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div><span className="text-muted-foreground">Produto:</span> <strong>{product.name}</strong></div>
          {product.sku && <div><span className="text-muted-foreground">SKU:</span> {product.sku}</div>}
          <div><span className="text-muted-foreground">Estoque atual:</span> <strong>{currentStock}</strong></div>

          {flavors && flavors.length > 0 && (
            <div>
              <Label>Variação (opcional)</Label>
              <Select value={flavorId || 'none'} onValueChange={(v) => setFlavorId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Produto base" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Produto base</SelectItem>
                  {flavors.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} {f.color ? `• ${f.color}` : ''} — estoque {f.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Quantidade</Label>
            <Input type="number" min={1} max={currentStock} value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))} />
          </div>

          <div>
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as Reason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={baixa.isPending}>
            {baixa.isPending ? 'Registrando…' : 'Confirmar Baixa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
