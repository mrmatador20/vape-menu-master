import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Copy, CheckCircle2, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBalcaoBaixa } from '@/hooks/useBalcao';
import { useFlavors } from '@/hooks/useFlavors';
import type { Product } from '@/context/CartContext';
import { getPromoPrice } from '@/lib/balcaoPricing';


type Reason = 'venda_loja' | 'produto_danificado' | 'troca' | 'ajuste_estoque' | 'outro';
const REASONS: { value: Reason; label: string }[] = [
  { value: 'venda_loja', label: 'Venda Loja Física' },
  { value: 'produto_danificado', label: 'Produto Danificado' },
  { value: 'troca', label: 'Troca' },
  { value: 'ajuste_estoque', label: 'Ajuste de Estoque' },
  { value: 'outro', label: 'Outro' },
];

type PaymentMethod = 'dinheiro' | 'pix_balcao' | 'credito_balcao' | 'debito_balcao';
const PAYMENTS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix_balcao', label: 'Pix Balcão' },
  { value: 'credito_balcao', label: 'Cartão de Crédito Balcão' },
  { value: 'debito_balcao', label: 'Cartão de Débito Balcão' },
];

const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

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
  const [payment, setPayment] = useState<PaymentMethod>('dinheiro');
  const [discountMode, setDiscountMode] = useState<'brl' | 'percent'>('brl');
  const [discountInput, setDiscountInput] = useState('');
  // Pix Balcão (Asaas dinâmico)
  const [pixCpf, setPixCpf] = useState('');
  const [pixLoading, setPixLoading] = useState(false);
  const [pixOrderId, setPixOrderId] = useState<string | null>(null);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixPaid, setPixPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoBaixaRef = useRef(false);

  const resetPix = () => {
    setPixLoading(false);
    setPixOrderId(null);
    setPixQr(null);
    setPixPayload(null);
    setPixPaid(false);
    setCopied(false);
    autoBaixaRef.current = false;
  };

  useEffect(() => {
    if (open) {
      setFlavorId('');
      setQuantity(1);
      setReason('venda_loja');
      setNotes('');
      setPayment('dinheiro');
      setDiscountMode('brl');
      setDiscountInput('');
      setPixCpf('');
      resetPix();
      setRequestId(crypto.randomUUID());
    }
  }, [open, product?.id]);


  const flavor = useMemo(
    () => (flavorId && flavors ? flavors.find((f) => f.id === flavorId) ?? null : null),
    [flavorId, flavors],
  );

  const currentStock = useMemo(() => {
    if (flavor) return flavor.stock ?? 0;
    return product?.stock ?? 0;
  }, [flavor, product]);

  const pricing = useMemo(() => {
    if (!product) return { base: 0, unit: 0, hasPromo: false };
    const base = flavor?.price != null ? Number(flavor.price) : product.price;
    return getPromoPrice(base, product.discount_value, product.discount_type as 'percent' | 'fixed' | undefined);
  }, [product, flavor]);

  const subtotal = useMemo(() => Number((pricing.unit * quantity).toFixed(2)), [pricing.unit, quantity]);

  const manualDiscount = useMemo(() => {
    const raw = Number(discountInput.replace(',', '.'));
    if (!raw || raw <= 0) return 0;
    const value = discountMode === 'percent' ? (subtotal * Math.min(raw, 100)) / 100 : raw;
    return Math.min(Number(value.toFixed(2)), subtotal);
  }, [discountInput, discountMode, subtotal]);

  const finalPrice = useMemo(() => Number((subtotal - manualDiscount).toFixed(2)), [subtotal, manualDiscount]);

  // Confirmação automática via webhook do Asaas (Supabase Realtime)
  useEffect(() => {
    if (!pixOrderId) return;
    const channel = supabase
      .channel(`balcao-pix-${pixOrderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${pixOrderId}` },
        (payload) => {
          const status = (payload.new as { status?: string })?.status;
          if (status && ['confirmed', 'paid', 'received', 'shipped', 'delivered'].includes(status)) {
            setPixPaid(true);
          }
        },
      )
      .subscribe();

    // Fallback: consulta periódica caso o canal falhe
    const poll = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status').eq('id', pixOrderId).maybeSingle();
      if (data?.status && ['confirmed', 'paid', 'received', 'shipped', 'delivered'].includes(data.status)) {
        setPixPaid(true);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [pixOrderId]);

  // Dá baixa no estoque automaticamente assim que o pagamento é confirmado
  useEffect(() => {
    if (!pixPaid || !product || autoBaixaRef.current) return;
    autoBaixaRef.current = true;
    clearInterval(undefined);
    baixa
      .mutateAsync({
        product_id: product.id,
        flavor_id: flavorId || null,
        quantity,
        movement_type: 'venda_loja_fisica',
        reason: 'venda_loja',
        notes: notes.trim() || null,
        request_id: requestId,
        manual_discount: manualDiscount,
        payment_method: 'pix_balcao',
      })
      .then(() => toast.success('Pagamento confirmado e baixa registrada!'))
      .catch((e: any) => toast.error(e?.message || 'Pagamento confirmado, mas falhou a baixa do estoque'));
  }, [pixPaid]);

  if (!product) return null;

  const isSale = reason === 'venda_loja';
  const isPix = isSale && payment === 'pix_balcao';

  const generatePix = async () => {
    if (!quantity || quantity < 1) return toast.error('Quantidade inválida');
    if (quantity > currentStock) return toast.error('Quantidade maior que o estoque');
    if (finalPrice <= 0) return toast.error('Valor da venda inválido');
    setPixLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('balcao-pix-charge', {
        body: {
          amount: finalPrice,
          description: `${product.name}${flavor ? ` • ${flavor.name}` : ''} (${quantity}x)`,
          customerCpf: pixCpf.replace(/\D/g, ''),
          customerName: 'Cliente Balcão',
        },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setPixOrderId((data as any).orderId);
      setPixQr((data as any).qrCodeBase64 ?? null);
      setPixPayload((data as any).qrCode ?? null);
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível gerar o Pix');
    } finally {
      setPixLoading(false);
    }
  };

  const copyPayload = async () => {
    if (!pixPayload) return;
    await navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    toast.success('Código Pix copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async () => {
    if (!quantity || quantity < 1) return toast.error('Quantidade inválida');
    if (quantity > currentStock) return toast.error('Quantidade maior que o estoque');
    try {
      await baixa.mutateAsync({
        product_id: product.id,
        flavor_id: flavorId || null,
        quantity,
        movement_type: isSale ? 'venda_loja_fisica' : 'baixa_manual',
        reason,
        notes: notes.trim() || null,
        request_id: requestId,
        manual_discount: isSale ? manualDiscount : 0,
        payment_method: isSale ? payment : null,
      });
      toast.success('Baixa registrada com sucesso');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao registrar baixa');
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmar venda / baixa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex gap-3 items-center">
            <div className="h-16 w-16 rounded-md bg-muted overflow-hidden shrink-0">
              {(flavor?.image_url || product.image) && (
                <img src={flavor?.image_url || product.image} alt={product.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-medium line-clamp-2">{product.name}</div>
              {flavor && <div className="text-xs text-muted-foreground">Variação: {flavor.name}</div>}
              {product.sku && <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>}
              <div className="text-xs text-muted-foreground">Estoque atual: <strong>{currentStock}</strong></div>
            </div>
          </div>

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

          {isSale && (
            <>
              <div className="rounded-md border p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço unitário</span>
                  <span>
                    {pricing.hasPromo && (
                      <span className="line-through text-muted-foreground mr-2">{brl(pricing.base)}</span>
                    )}
                    <strong>{brl(pricing.unit)}</strong>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({quantity}x)</span>
                  <span>{brl(subtotal)}</span>
                </div>
                {manualDiscount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Desconto no balcão</span>
                    <span>- {brl(manualDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t text-base">
                  <span className="font-medium">Total a cobrar</span>
                  <strong>{brl(finalPrice)}</strong>
                </div>
              </div>

              <div>
                <Label>Desconto adicional</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                  />
                  <Select value={discountMode} onValueChange={(v) => setDiscountMode(v as 'brl' | 'percent')}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brl">R$</SelectItem>
                      <SelectItem value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Forma de pagamento</Label>
                <Select value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={baixa.isPending}>
            {baixa.isPending ? 'Registrando…' : isSale ? `Confirmar venda • ${brl(finalPrice)}` : 'Confirmar Baixa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
