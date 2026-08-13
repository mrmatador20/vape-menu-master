import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Copy, CheckCircle2, Clock, Lock, ShieldCheck,
  CreditCard, Calendar, KeyRound, User, MapPin, Package, Truck,
  Sparkles, FileText, BadgeCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { buildInstallmentOptions, calcInstallment, MAX_INSTALLMENTS } from '@/lib/installments';


interface OrderSummaryItem {
  name?: string;
  quantity?: number;
  price?: number;
  flavor?: string;
  image?: string;
}
interface OrderSummaryAddress {
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
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
  items?: OrderSummaryItem[];
  address?: OrderSummaryAddress;
  shippingCost?: number;
  subtotal?: number;
  estimatedDelivery?: string;
}

/* ------------ máscaras / utils ------------ */
const maskCard = (v: string) =>
  v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
const maskExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const maskCcv = (v: string) => v.replace(/\D/g, '').slice(0, 4);
const maskCpf = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

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

const detectBrand = (num: string): { name: string; color: string } | null => {
  const n = num.replace(/\D/g, '');
  if (!n) return null;
  if (/^4/.test(n)) return { name: 'Visa', color: 'from-blue-500 to-blue-700' };
  if (/^(5[1-5]|2[2-7])/.test(n)) return { name: 'Mastercard', color: 'from-orange-500 to-red-600' };
  if (/^3[47]/.test(n)) return { name: 'Amex', color: 'from-sky-400 to-sky-600' };
  if (/^(4011|4312|4389|4514|4573|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n))
    return { name: 'Elo', color: 'from-yellow-500 to-zinc-800' };
  if (/^(384100|384140|384160|606282|637095|637568|60)/.test(n))
    return { name: 'Hipercard', color: 'from-red-600 to-red-800' };
  return null;
};

/* ============================================ */
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
    holderName: '', number: '', expiry: '', ccv: '', cpf: payerCpf ? maskCpf(payerCpf) : '',
  });

  const brand = useMemo(() => detectBrand(card.number), [card.number]);

  useEffect(() => {
    if (!open) return;
    if (!isCard) createPayment();
    return () => setCard({ holderName: '', number: '', expiry: '', ccv: '', cpf: payerCpf ? maskCpf(payerCpf) : '' });
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
        payerName, payerEmail,
        payerCpf: cardData?.cpf?.replace(/\D/g, '') || payerCpf,
        payerPhone,
      };
      if (isCard && cardData) {
        const [mm, yy] = cardData.expiry.split('/');
        body.cardHolderName = cardData.holderName.trim();
        body.cardNumber = cardData.number.replace(/\D/g, '');
        body.cardExpiryMonth = mm;
        body.cardExpiryYear = yy;
        body.cardCcv = cardData.ccv;
        body.cardHolderCpf = cardData.cpf.replace(/\D/g, '');
        body.installmentCount = installments;
        const cepDigits = (address?.cep || '').replace(/\D/g, '');
        if (cepDigits.length === 8) body.cardHolderPostalCode = cepDigits;
        if (address?.numero) body.cardHolderAddressNumber = String(address.numero).substring(0, 10);
        if (payerPhone) body.cardHolderPhone = String(payerPhone).replace(/\D/g, '');
      }
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', { body });
      if (isCard) setCard({ holderName: '', number: '', expiry: '', ccv: '', cpf: '' });

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
    if (card.cpf.replace(/\D/g, '').length !== 11) { toast.error('CPF inválido'); return; }
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
    if (paymentMethod !== 'credit') {
      const single = calcInstallment(amount, 1);
      return [{ n: 1, ...single, label: 'À vista, sem juros' }];
    }
    return buildInstallmentOptions(amount, MAX_INSTALLMENTS);
  }, [amount, paymentMethod]);

  const selectedOption = useMemo(
    () => installmentOptions.find((o) => o.n === installments) ?? installmentOptions[0],
    [installmentOptions, installments]
  );


  /* ------------- estilo input ------------- */
  const inputBase =
    "h-14 rounded-xl bg-secondary/30 border-border/60 pl-12 text-[15px] transition-all " +
    "focus-visible:ring-0 focus-visible:border-primary focus-visible:bg-background " +
    "focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.15),0_8px_30px_-10px_hsl(var(--primary)/0.4)]";

  /* ============ Coluna esquerda (resumo) ============ */
  const orderSummary = (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80 mb-1">Fox Velour</p>
        <h2 className="text-xl font-bold tracking-tight">Revisão do Pedido</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Confira tudo antes de pagar</p>
      </div>

      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
          <Package className="w-3 h-3" /> Itens
        </h3>
        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
          {items?.map((it, i) => (
            <div key={i} className="flex gap-3 items-start group">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-secondary to-background border border-border/60 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm group-hover:border-primary/40 transition-colors">
                {it.image ? (
                  <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{it.name}</p>
                {it.flavor && <p className="text-[11px] text-muted-foreground mt-0.5">{it.flavor}</p>}
                <p className="text-[11px] text-muted-foreground mt-0.5">Qtd: {it.quantity}</p>
              </div>
              <p className="text-sm font-bold whitespace-nowrap">
                R$ {(it.price * it.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {address && (
        <>
          <Separator className="bg-border/40" />
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Endereço de Entrega
            </h3>
            <p className="text-sm leading-relaxed text-foreground/90">
              {address.rua}, {address.numero}<br />
              <span className="text-muted-foreground">{address.bairro} — {address.cidade}</span>
              {address.cep && <><br /><span className="text-xs text-muted-foreground">CEP: {address.cep}</span></>}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-primary/90 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
              <Truck className="w-3.5 h-3.5" />
              <span>Prazo: {estimatedDelivery || '3 a 7 dias úteis'}</span>
            </div>
          </div>
        </>
      )}

      <Separator className="bg-border/40" />

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
              {shippingCost === 0 ? <span className="text-primary font-semibold">Grátis</span> : `R$ ${shippingCost.toFixed(2)}`}
            </span>
          </div>
        )}
        <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-primary/15 via-accent/5 to-transparent border border-primary/25 shadow-[inset_0_1px_0_hsl(var(--primary)/0.15)]">
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/80">Total</span>
            <span className="text-3xl font-bold bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent">
              R$ {amount.toFixed(2)}
            </span>
          </div>
          {paymentMethod === 'credit' && installments > 1 && selectedOption && (
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              ou {installments}x de R$ {selectedOption.installmentValue.toFixed(2)}{' '}
              {selectedOption.hasInterest
                ? `(com juros — total R$ ${selectedOption.totalValue.toFixed(2)})`
                : 'sem juros'}
            </p>
          )}

        </div>
      </div>
    </div>
  );

  /* ------------ trust badges ------------ */
  const trustBadges = (
    <div className="grid grid-cols-2 gap-2 pt-3">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 border border-border/40">
        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Asaas oficial</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 border border-border/40">
        <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>SSL / PCI-DSS</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 border border-border/40 col-span-2">
        <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Seus dados nunca são armazenados em nossos servidores</span>
      </div>
    </div>
  );

  /* ------------ form cartão ------------ */
  const cardForm = (
    <form onSubmit={handleSubmitCard} className="space-y-4 animate-fade-in" autoComplete="off">
      {/* Cartão pré-visualização */}
      <div className="relative h-44 rounded-2xl p-5 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black overflow-hidden shadow-xl mb-2">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex flex-col h-full justify-between text-white">
          <div className="flex justify-between items-start">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-inner" />
            {brand ? (
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md text-white shadow-md bg-gradient-to-br",
                brand.color
              )}>
                {brand.name}
              </span>
            ) : (
              <CreditCard className="w-6 h-6 opacity-40" />
            )}
          </div>
          <div className="font-mono text-lg tracking-[0.2em]">
            {card.number || '•••• •••• •••• ••••'}
          </div>
          <div className="flex justify-between text-[11px] uppercase tracking-wider opacity-90">
            <div>
              <p className="opacity-50 text-[9px]">Titular</p>
              <p className="truncate max-w-[180px]">{card.holderName || 'NOME DO TITULAR'}</p>
            </div>
            <div className="text-right">
              <p className="opacity-50 text-[9px]">Validade</p>
              <p>{card.expiry || 'MM/AA'}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="holderName" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
          Nome impresso no cartão
        </Label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="holderName" value={card.holderName} autoComplete="cc-name"
            onChange={(e) => setCard({ ...card, holderName: e.target.value.toUpperCase() })}
            placeholder="COMO ESTÁ NO CARTÃO" maxLength={100} required
            className={inputBase}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="cardNumber" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
          Número do cartão
        </Label>
        <div className="relative">
          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="cardNumber" inputMode="numeric" autoComplete="cc-number"
            value={card.number}
            onChange={(e) => setCard({ ...card, number: maskCard(e.target.value) })}
            placeholder="0000 0000 0000 0000" required
            className={cn(inputBase, "pr-24 tracking-wider font-mono")}
          />
          {brand && (
            <span className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md text-white shadow-md bg-gradient-to-br",
              brand.color
            )}>
              {brand.name}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="expiry" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
            Validade
          </Label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="expiry" inputMode="numeric" autoComplete="cc-exp"
              value={card.expiry}
              onChange={(e) => setCard({ ...card, expiry: maskExpiry(e.target.value) })}
              placeholder="MM/AA" required className={inputBase}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="ccv" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
            CVV
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="ccv" inputMode="numeric" autoComplete="cc-csc"
              value={card.ccv}
              onChange={(e) => setCard({ ...card, ccv: maskCcv(e.target.value) })}
              placeholder="123" required className={inputBase}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="cpf" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
          CPF do titular
        </Label>
        <div className="relative">
          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="cpf" inputMode="numeric"
            value={card.cpf}
            onChange={(e) => setCard({ ...card, cpf: maskCpf(e.target.value) })}
            placeholder="000.000.000-00" required className={inputBase}
          />
        </div>
      </div>

      {paymentMethod === 'credit' && (
        <div>
          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
            Parcelamento
          </Label>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-border/60 bg-secondary/20 divide-y divide-border/40">
            {installmentOptions.map((opt) => {
              const active = installments === opt.n;
              return (
                <button
                  type="button"
                  key={opt.n}
                  onClick={() => setInstallments(opt.n)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-all",
                    active
                      ? "bg-gradient-to-r from-primary/15 via-accent/5 to-transparent"
                      : "hover:bg-secondary/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                      active ? "border-primary bg-primary" : "border-border"
                    )}>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {opt.n}x de R$ {opt.installmentValue.toFixed(2)}{' '}
                        <span className={cn("text-[11px] font-medium", opt.hasInterest ? "text-amber-500" : "text-primary")}>
                          {opt.hasInterest ? '(com juros)' : 'sem juros'}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">{opt.label}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-foreground/80">
                    R$ {opt.totalValue.toFixed(2)}
                  </p>

                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-14 mt-2 rounded-xl text-base font-semibold gap-2 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] bg-left hover:bg-right text-primary-foreground shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] hover:shadow-[0_15px_50px_-10px_hsl(var(--primary)/0.8)] transition-all duration-500"
      >
        <Lock className="w-4 h-4" />
        Finalizar pagamento
        <Sparkles className="w-4 h-4 opacity-70" />
      </Button>

      {trustBadges}
    </form>
  );

  /* ------------ pix view ------------ */
  const pixView = (
    <div className="space-y-4 animate-fade-in">
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
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
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

  /* ------------ header ------------ */
  const headerBlock = (
    <div className="space-y-2 pb-1">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]">
          <Lock className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight leading-tight">Pagamento Seguro</h3>
          <p className="text-[11px] text-muted-foreground">Criptografado de ponta a ponta</p>
        </div>
      </div>
    </div>
  );

  /* ------------ right column ------------ */
  const rightColumn = (
    <div className="space-y-5">
      {phase === 'form' && isCard && cardForm}

      {phase === 'processing' && (
        <div className="flex flex-col items-center py-16 space-y-5 animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-primary/15 border-t-primary animate-spin" />
            <Lock className="absolute inset-0 m-auto w-7 h-7 text-primary" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold">
              {isCard ? 'Processando pagamento' : 'Gerando QR Code PIX'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isCard ? 'Validando seu cartão com segurança...' : 'Conectando ao Asaas...'}
            </p>
          </div>
          {trustBadges}
        </div>
      )}

      {phase === 'error' && (
        <div className="text-center py-10 space-y-4 animate-fade-in">
          <p className="text-destructive font-medium">{errorMsg || 'Erro ao processar pagamento'}</p>
          <Button
            onClick={() => setPhase(isCard ? 'form' : 'processing')}
            className="rounded-xl h-12 px-6 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      {phase === 'confirmed' && (
        <div className="flex flex-col items-center py-16 space-y-4 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="w-14 h-14 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">Pagamento Confirmado!</p>
            <p className="text-sm text-muted-foreground mt-1">Seu pedido foi aprovado com sucesso.</p>
          </div>
        </div>
      )}

      {phase === 'pix' && pixView}
    </div>
  );

  const hasSummary = !!(items && items.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden border-border/40 rounded-3xl shadow-2xl",
          "backdrop-blur-2xl bg-background/95",
          hasSummary ? "sm:max-w-5xl max-h-[94vh]" : "sm:max-w-md"
        )}
      >
        <div className={cn("grid", hasSummary && "md:grid-cols-[1fr_1.15fr]")}>
          {hasSummary && (
            <aside className="hidden md:block bg-gradient-to-br from-secondary/70 via-background to-background p-8 border-r border-border/40 overflow-y-auto max-h-[94vh]">
              {orderSummary}
            </aside>
          )}

          <div className="p-7 md:p-8 overflow-y-auto max-h-[94vh]">
            {headerBlock}
            <div className="mt-5">{rightColumn}</div>

            {hasSummary && (
              <div className="md:hidden mt-8 pt-6 border-t border-border/40">
                {orderSummary}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
