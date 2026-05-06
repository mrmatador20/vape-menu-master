import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
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

export const AsaasPaymentDialog = ({
  open,
  onOpenChange,
  orderId,
  amount,
  description,
  paymentMethod,
  payerName,
  payerEmail,
  payerCpf,
  payerPhone,
  onPaymentConfirmed,
}: AsaasPaymentDialogProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'error'>('pending');

  useEffect(() => {
    if (open) {
      createPayment();
      const cleanup = startPolling();
      return cleanup;
    }
  }, [open]);

  const createPayment = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: { orderId, amount, description, paymentMethod, payerName, payerEmail, payerCpf, payerPhone },
      });

      if (error || !data?.success) {
        console.error('[Asaas] Error:', error, data);
        toast.error(data?.error || 'Erro ao gerar pagamento. Tente novamente.');
        setPaymentStatus('error');
        return;
      }

      setQrCodeBase64(data.qrCodeBase64 || null);
      setQrCode(data.qrCode || null);
      setInvoiceUrl(data.invoiceUrl || null);
      toast.success(paymentMethod === 'pix' ? 'QR Code PIX gerado!' : 'Pagamento criado!');
    } catch (e) {
      console.error('[Asaas] Error:', e);
      toast.error('Erro ao gerar pagamento.');
      setPaymentStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    const interval = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
      if (data?.status === 'confirmed') {
        setPaymentStatus('confirmed');
        clearInterval(interval);
        toast.success('Pagamento confirmado!');
        onPaymentConfirmed();
      } else if (data?.status === 'cancelled') {
        setPaymentStatus('error');
        clearInterval(interval);
        toast.error('Pagamento cancelado.');
      }
    }, 3000);
    const timeoutId = setTimeout(() => clearInterval(interval), 600000);
    return () => { clearInterval(interval); clearTimeout(timeoutId); };
  };

  const handleCopy = () => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const title = paymentStatus === 'confirmed'
    ? 'Pagamento Confirmado!'
    : paymentMethod === 'pix' ? 'Pagamento PIX' : 'Pagamento com Cartão';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando pagamento...</p>
            </div>
          )}

          {!isLoading && paymentStatus === 'error' && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Erro ao gerar pagamento</p>
              <Button onClick={createPayment}>Tentar Novamente</Button>
            </div>
          )}

          {!isLoading && paymentStatus === 'confirmed' && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-green-600">Pagamento Confirmado!</p>
            </div>
          )}

          {!isLoading && paymentStatus === 'pending' && paymentMethod === 'pix' && qrCodeBase64 && (
            <>
              <div className="flex flex-col items-center space-y-4">
                <img
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-64 h-64 border-2 border-border rounded-lg"
                />
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

          {!isLoading && paymentStatus === 'pending' && paymentMethod !== 'pix' && invoiceUrl && (
            <div className="flex flex-col items-center py-4 space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Clique no botão abaixo para concluir o pagamento com cartão de forma segura no ambiente Asaas.
              </p>
              <Button asChild size="lg" className="gap-2">
                <a href={invoiceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" /> Pagar com Cartão
                </a>
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Aguardando confirmação...</span>
              </div>
            </div>
          )}

          <div className="text-xs text-center text-muted-foreground">
            Valor: R$ {amount.toFixed(2)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
