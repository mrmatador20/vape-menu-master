import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Copy, CheckCircle2, Clock, Lock, ShieldCheck,
  CreditCard, Calendar, KeyRound, User, MapPin, Package, Truck, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface OrderSummaryItem {
  name: string;
  quantity: number;
  price: number;
  flavor?: string;
  image?: string;
}

interface OrderSummaryAddress {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep?: string;
}

interface AsaasPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  amount: number;
  description: string;
  paymentMethod: 'pix' | 'credit' | 'debit';
  payerName?: string;
  payerEmail?: string;
  payerCpf?: string;
  payerPhone?: string;
  onPaymentConfirmed: () => void;
  // Premium summary (optional)
  items?: OrderSummaryItem[];
  address?: OrderSummaryAddress;
  shippingCost?: number;
  subtotal?: number;
  estimatedDelivery?: string;
}

// Máscaras
const maskCard = (v: string) =>
  v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
const maskExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const maskCcv = (v: string) => v.replace(/\D/g, '').slice(0, 4);

const luhnCheck = (num: string): boolean => {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
};

// Detectar bandeira
const detectBrand = (num: string): string | null => {
  const n = num.replace(/\D/g, '');
  if (!n) return null;
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^(4011|4312|4389|4514|4573|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return 'Elo';
  if (/^(384100|384140|384160|606282|637095|637568|60)/.test(n)) return 'Hipercard';
  return null;
};

export const AsaasPaymentDialog = ({
  open, onOpenChange, orderId, amount, description, paymentMethod,
  payerName, payerEmail, payerCpf, payerPhone, onPaymentConfirmed,
  items, address, shippingCost, subtotal, estimatedDelivery,
}: AsaasPaymentDialogProps) => {
  const isCard = paymentMethod === 'credit' || paymentMethod === 'debit';
  const [phase, setPhase] = useState<'form' | 'processing' | 'pix' | 'confirmed' | 'error'>(
    isCard ? 'form' : 'processing'
  );
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [installments, setInstallments] = useState<number>(1);

  const [card, setCard] = useState({
    holderName: '', number: '', expiry: '', ccv: '',
  });

  const brand = useMemo(() => detectBrand(card.number), [card.number]);

  useEffect(() => {
    if (!open) return;
    if (!isCard) createPayment();
    return () => setCard({ holderName: '', number: '', expiry: '', ccv: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || phase === 'form' || phase === 'confirmed') return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
      if (data?.status === 'confirmed') {
        setPhase('confirmed');
        clearInterval(interval);
        toast.success('Pagamento confirmado!');
        onPaymentConfirmed();
      } else if (data?.status === 'cancelled') {
        setPhase('error');
        setErrorMsg('Pagamento cancelado.');
        clearInterval(interval);
      }
    }, 3000);
    const timeoutId = setTimeout(() => clearInterval(interval), 600000);
    return () => { clearInterval(interval); clearTimeout(timeoutId); };
  }, [open, phase, orderId, onPaymentConfirmed]);

  const createPayment = async (cardData?: typeof card) => {
    try {
      setPhase('processing');
      setErrorMsg('');
      const body: Record<string, unknown> = {
        orderId, amount, description, paymentMethod,
        payerName, payerEmail, payerCpf, payerPhone,
      };
      if (isCard && cardData) {
        const [mm, yy] = cardData.expiry.split('/');
        body.cardHolderName = cardData.holderName.trim();
        body.cardNumber = cardData.number.replace(/\D/g, '');
        body.cardExpiryMonth = mm;
        body.cardExpiryYear = yy;
        body.cardCcv = cardData.ccv;
        body.cardHolderCpf = payerCpf;
        body.installmentCount = installments;
      }
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', { body });
      if (isCard) setCard({ holderName: '', number: '', expiry: '', ccv: '' });

      if (error || !data?.success) {
        const msg = (data as any)?.error || 'Erro ao processar pagamento.';
        setErrorMsg(msg); setPhase('error'); toast.error(msg); return;
      }
      if (data.confirmed) {
        setPhase('confirmed'); toast.success('Pagamento aprovado!'); onPaymentConfirmed(); return;
      }
      if (paymentMethod === 'pix') {
        setQrCodeBase64(data.qrCodeBase64 || null);
        setQrCode(data.qrCode || null);
        setPhase('pix');
        toast.success('QR Code PIX gerado!');
      } else {
        setPhase('processing');
        toast.info('Aguardando confirmação do pagamento...');
      }
    } catch (e) {
      setErrorMsg('Erro ao processar pagamento.'); setPhase('error');
    }
  };

  const handleSubmitCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!card.holderName.trim() || card.holderName.trim().length < 3) {
      toast.error('Nome do titular inválido'); return;
    }
    const num = card.number.replace(/\D/g, '');
    if (!luhnCheck(num)) { toast.error('Número do cartão inválido'); return; }
    const [mm, yy] = card.expiry.split('/');
    if (!mm || !yy || parseInt(mm) < 1 || parseInt(mm) > 12 || yy.length !== 2) {
      toast.error('Validade inválida (MM/AA)'); return;
    }
    if (card.ccv.length < 3) { toast.error('CVV inválido'); return; }
    createPayment(card);
  };

  const handleCopy = () => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const installmentOptions = useMemo(() => {
    const max = paymentMethod === 'credit' ? 12 : 1;
    return Array.from({ length: max }, (_, i) => {
      const n = i + 1;
      const value = amount / n;
      return { n, label: n === 1 ? `À vista — R$ ${amount.toFixed(2)}` : `${n}x de R$ ${value.toFixed(2)} sem juros` };
    });
  }, [amount, paymentMethod]);

  const inputBase = "h-12 rounded-xl bg-secondary/40 border-border/60 pl-11 transition-all focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary focus-visible:bg-background focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]";

  const headerBlock = (
    <DialogHeader className="space-y-3 pb-2">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
        <Lock className="w-7 h-7 text-primary-foreground" />
      </div>
      <DialogTitle className="text-center text-2xl font-bold tracking-tight">
        Pagamento Seguro
      </DialogTitle>
      <p className="text-center text-sm text-muted-foreground">
        Seus dados estão protegidos e criptografados
      </p>
    </DialogHeader>
  );

  const orderSummary = (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <Package className="w-3.5 h-3.5" /> Resumo do Pedido
        </h3>
        <div className="space-y-3">
          {items?.map((it, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-14 h-14 rounded-xl bg-secondary border border-border/60 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {it.image ? (
                  <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{it.name}</p>
                {it.flavor && <p className="text-xs text-muted-foreground mt-0.5">{it.flavor}</p>}
                <p className="text-xs text-muted-foreground">Qtd: {it.quantity}</p>
              </div>
              <p className="text-sm font-semibold whitespace-nowrap">
                R$ {(it.price * it.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {address && (
        <>
          <Separator />
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" /> Entrega
            </h3>
            <p className="text-sm leading-relaxed text-foreground/90">
              {address.rua}, {address.numero}<br />
              {address.bairro} — {address.cidade}
              {address.cep && <><br />CEP: {address.cep}</>}
            </p>
            {estimatedDelivery && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Prazo estimado: {estimatedDelivery}
              </p>
            )}
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-2">
        {typeof subtotal === 'number' && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
          </div>
        )}
        {typeof shippingCost === 'number' && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frete</span>
            <span className="font-medium">
              {shippingCost === 0 ? <span className="text-primary">Grátis</span> : `R$ ${shippingCost.toFixed(2)}`}
            </span>
          </div>
        )}
        <div className="mt-3 p-4 rounded-xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/20">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold uppercase tracking-wider">Total</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              R$ {amount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const trustBadges = (
    <div className="space-y-2 pt-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span>Pagamento processado pelo Asaas</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5 text-primary" />
        <span>Ambiente 100% seguro com criptografia SSL</span>
      </div>
    </div>
  );

  const cardForm = (
    <form onSubmit={handleSubmitCard} className="space-y-4" autoComplete="off">
      <div>
        <Label htmlFor="holderName" className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Nome impresso no cartão
        </Label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="holderName" value={card.holderName} autoComplete="cc-name"
            onChange={(e) => setCard({ ...card, holderName: e.target.value.toUpperCase() })}
            placeholder="COMO ESTÁ NO CARTÃO" maxLength={100} required
            className={inputBase}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="cardNumber" className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Número do cartão
        </Label>
        <div className="relative">
          <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="cardNumber" inputMode="numeric" autoComplete="cc-number"
            value={card.number}
            onChange={(e) => setCard({ ...card, number: maskCard(e.target.value) })}
            placeholder="0000 0000 0000 0000" required
            className={cn(inputBase, "pr-20 tracking-wider font-mono")}
          />
          {brand && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
              {brand}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="expiry" className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Validade
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="expiry" inputMode="numeric" autoComplete="cc-exp"
              value={card.expiry}
              onChange={(e) => setCard({ ...card, expiry: maskExpiry(e.target.value) })}
              placeholder="MM/AA" required className={inputBase}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="ccv" className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            CVV
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="ccv" inputMode="numeric" autoComplete="cc-csc"
              value={card.ccv}
              onChange={(e) => setCard({ ...card, ccv: maskCcv(e.target.value) })}
              placeholder="123" required className={inputBase}
            />
          </div>
        </div>
      </div>

      {paymentMethod === 'credit' && (
        <div>
          <Label htmlFor="installments" className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Parcelamento
          </Label>
          <select
            id="installments"
            value={installments}
            onChange={(e) => setInstallments(parseInt(e.target.value))}
            className="h-12 w-full rounded-xl bg-secondary/40 border border-border/60 px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background"
          >
            {installmentOptions.map((opt) => (
              <option key={opt.n} value={opt.n}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-14 rounded-xl text-base font-semibold bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] bg-left hover:bg-right text-primary-foreground shadow-[var(--shadow-glow)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)] transition-all duration-500"
      >
        <Lock className="w-4 h-4" />
        Finalizar pagamento
        <Sparkles className="w-4 h-4 opacity-70" />
      </Button>

      {trustBadges}
    </form>
  );

  const pixView = (
    <div className="space-y-4">
      {qrCodeBase64 && (
        <>
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20">
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-56 h-56 rounded-xl bg-background"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 animate-pulse text-primary" />
              <span>Aguardando pagamento...</span>
            </div>
          </div>
          {qrCode && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground text-center">
                Ou copie o código PIX
              </p>
              <div className="flex gap-2">
                <input
                  type="text" value={qrCode} readOnly
                  className="flex-1 px-3 py-2.5 text-xs bg-secondary/50 rounded-xl border border-border/60 font-mono"
                />
                <Button onClick={handleCopy} variant="outline" size="icon" className="h-auto rounded-xl shrink-0">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      {trustBadges}
    </div>
  );

  const rightColumn = (
    <div className="space-y-5">
      {phase === 'form' && isCard && cardForm}

      {phase === 'processing' && (
        <div className="flex flex-col items-center py-12 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Lock className="absolute inset-0 m-auto w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isCard ? 'Processando pagamento com segurança...' : 'Gerando seu QR Code PIX...'}
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div className="text-center py-8 space-y-4">
          <p className="text-destructive">{errorMsg || 'Erro ao processar pagamento'}</p>
          <Button
            onClick={() => setPhase(isCard ? 'form' : 'processing')}
            className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      {phase === 'confirmed' && (
        <div className="flex flex-col items-center py-12 space-y-4 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">Pagamento Confirmado!</p>
            <p className="text-sm text-muted-foreground mt-1">Seu pedido foi aprovado com sucesso.</p>
          </div>
        </div>
      )}

      {phase === 'pix' && pixView}
    </div>
  );

  const hasSummary = items && items.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden border-border/40 rounded-3xl shadow-2xl",
          "backdrop-blur-xl bg-background/95",
          hasSummary ? "sm:max-w-4xl max-h-[92vh]" : "sm:max-w-md"
        )}
      >
        <div className={cn("grid", hasSummary && "md:grid-cols-[1fr_1.1fr]")}>
          {hasSummary && (
            <aside className="hidden md:block bg-gradient-to-br from-secondary/60 via-background to-background p-7 border-r border-border/40 overflow-y-auto max-h-[92vh]">
              {orderSummary}
            </aside>
          )}

          <div className="p-7 overflow-y-auto max-h-[92vh]">
            {headerBlock}
            <div className="mt-4">{rightColumn}</div>

            {/* Mobile summary */}
            {hasSummary && (
              <div className="md:hidden mt-6 pt-6 border-t border-border/40">
                {orderSummary}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
