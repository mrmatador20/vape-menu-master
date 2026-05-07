import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, CheckCircle2, Clock, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
}

// Máscaras
const maskCard = (v: string) =>
  v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
const maskExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const maskCcv = (v: string) => v.replace(/\D/g, '').slice(0, 4);

// Validação Luhn
const luhnCheck = (num: string): boolean => {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

export const AsaasPaymentDialog = ({
  open, onOpenChange, orderId, amount, description, paymentMethod,
  payerName, payerEmail, payerCpf, payerPhone, onPaymentConfirmed,
}: AsaasPaymentDialogProps) => {
  const isCard = paymentMethod === 'credit' || paymentMethod === 'debit';
  const [phase, setPhase] = useState<'form' | 'processing' | 'pix' | 'confirmed' | 'error'>(
    isCard ? 'form' : 'processing'
  );
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Estado dos campos do cartão (apenas em memória, nunca persistido)
  const [card, setCard] = useState({
    holderName: '',
    number: '',
    expiry: '',
    ccv: '',
  });

  useEffect(() => {
    if (!open) return;
    if (!isCard) {
      createPayment();
    }
    return () => {
      // Limpa dados sensíveis ao fechar
      setCard({ holderName: '', number: '', expiry: '', ccv: '' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Polling para confirmar via webhook
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
      }

      const { data, error } = await supabase.functions.invoke('create-asaas-payment', { body });

      // Limpa dados sensíveis IMEDIATAMENTE após o envio
      if (isCard) setCard({ holderName: '', number: '', expiry: '', ccv: '' });

      if (error || !data?.success) {
        const msg = (data as any)?.error || 'Erro ao processar pagamento.';
        setErrorMsg(msg);
        setPhase('error');
        toast.error(msg);
        return;
      }

      if (data.confirmed) {
        setPhase('confirmed');
        toast.success('Pagamento aprovado!');
        onPaymentConfirmed();
        return;
      }

      if (paymentMethod === 'pix') {
        setQrCodeBase64(data.qrCodeBase64 || null);
        setQrCode(data.qrCode || null);
        setPhase('pix');
        toast.success('QR Code PIX gerado!');
      } else {
        // Cartão pendente: aguardar webhook
        setPhase('processing');
        toast.info('Aguardando confirmação do pagamento...');
      }
    } catch (e) {
      setErrorMsg('Erro ao processar pagamento.');
      setPhase('error');
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

  const title = phase === 'confirmed'
    ? 'Pagamento Confirmado!'
    : paymentMethod === 'pix' ? 'Pagamento PIX' : 'Pagamento com Cartão';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {phase === 'form' && isCard && (
            <form onSubmit={handleSubmitCard} className="space-y-3" autoComplete="off">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <Lock className="w-3.5 h-3.5" />
                <span>Conexão segura. Dados processados pelo Asaas.</span>
              </div>
              <div>
                <Label htmlFor="holderName">Nome impresso no cartão</Label>
                <Input id="holderName" value={card.holderName} autoComplete="cc-name"
                  onChange={(e) => setCard({ ...card, holderName: e.target.value.toUpperCase() })}
                  placeholder="COMO ESTÁ NO CARTÃO" maxLength={100} required />
              </div>
              <div>
                <Label htmlFor="cardNumber">Número do cartão</Label>
                <Input id="cardNumber" inputMode="numeric" autoComplete="cc-number"
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: maskCard(e.target.value) })}
                  placeholder="0000 0000 0000 0000" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="expiry">Validade (MM/AA)</Label>
                  <Input id="expiry" inputMode="numeric" autoComplete="cc-exp"
                    value={card.expiry}
                    onChange={(e) => setCard({ ...card, expiry: maskExpiry(e.target.value) })}
                    placeholder="MM/AA" required />
                </div>
                <div>
                  <Label htmlFor="ccv">CVV</Label>
                  <Input id="ccv" inputMode="numeric" autoComplete="cc-csc"
                    value={card.ccv}
                    onChange={(e) => setCard({ ...card, ccv: maskCcv(e.target.value) })}
                    placeholder="123" required />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg">
                Pagar R$ {amount.toFixed(2)}
              </Button>
            </form>
          )}

          {phase === 'processing' && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {isCard ? 'Processando pagamento...' : 'Gerando pagamento...'}
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{errorMsg || 'Erro ao processar pagamento'}</p>
              <Button onClick={() => setPhase(isCard ? 'form' : 'processing')}>Tentar Novamente</Button>
            </div>
          )}

          {phase === 'confirmed' && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-green-600">Pagamento Confirmado!</p>
            </div>
          )}

          {phase === 'pix' && qrCodeBase64 && (
            <>
              <div className="flex flex-col items-center space-y-4">
                <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code PIX"
                  className="w-64 h-64 border-2 border-border rounded-lg" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>Aguardando pagamento...</span>
                </div>
              </div>
              {qrCode && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center">Ou copie o código PIX:</p>
                  <div className="flex gap-2">
                    <input type="text" value={qrCode} readOnly
                      className="flex-1 px-3 py-2 text-xs bg-muted rounded-md border border-input" />
                    <Button onClick={handleCopy} variant="outline" size="sm" className="shrink-0">
                      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="text-xs text-center text-muted-foreground">
            Valor: R$ {amount.toFixed(2)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
