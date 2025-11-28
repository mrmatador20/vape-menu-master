import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MercadoPagoPixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  amount: number;
  description: string;
  payerEmail?: string;
  payerCpf?: string;
  onPaymentConfirmed: () => void;
}

export const MercadoPagoPixDialog = ({
  open,
  onOpenChange,
  orderId,
  amount,
  description,
  payerEmail,
  payerCpf,
  onPaymentConfirmed,
}: MercadoPagoPixDialogProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'error'>('pending');

  useEffect(() => {
    if (open) {
      generateQRCode();
      startPollingPaymentStatus();
    }
  }, [open]);

  const generateQRCode = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('create-mercadopago-payment', {
        body: {
          orderId,
          amount,
          description,
          payerEmail,
          payerCpf,
        },
      });

      if (error) {
        console.error('[MercadoPago] Error creating payment:', error);
        toast.error('Erro ao gerar QR Code PIX. Tente novamente.');
        setPaymentStatus('error');
        return;
      }

      if (!data.success) {
        console.error('[MercadoPago] Payment creation failed:', data);
        toast.error('Erro ao gerar QR Code PIX. Tente novamente.');
        setPaymentStatus('error');
        return;
      }

      setQrCodeBase64(data.qrCodeBase64);
      setQrCode(data.qrCode);
      setPaymentId(data.paymentId);
      toast.success('QR Code PIX gerado com sucesso!');
    } catch (error) {
      console.error('[MercadoPago] Error:', error);
      toast.error('Erro ao gerar QR Code PIX. Tente novamente.');
      setPaymentStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const startPollingPaymentStatus = () => {
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('status')
          .eq('id', orderId)
          .single();

        if (error) {
          console.error('[MercadoPago] Error checking payment status:', error);
          return;
        }

        console.log('[MercadoPago] Current order status:', data.status);

        if (data.status === 'confirmed') {
          setPaymentStatus('confirmed');
          clearInterval(interval);
          toast.success('Pagamento confirmado!');
          onPaymentConfirmed();
        } else if (data.status === 'cancelled') {
          setPaymentStatus('error');
          clearInterval(interval);
          toast.error('Pagamento cancelado ou rejeitado.');
        }
      } catch (error) {
        console.error('[MercadoPago] Error polling status:', error);
      }
    }, 3000); // Check every 3 seconds

    // Clear interval after 10 minutes
    setTimeout(() => clearInterval(interval), 600000);

    return () => clearInterval(interval);
  };

  const handleCopyQRCode = () => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {paymentStatus === 'confirmed' ? 'Pagamento Confirmado!' : 'Pagamento PIX'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code PIX...</p>
            </div>
          )}

          {!isLoading && paymentStatus === 'error' && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Erro ao gerar QR Code</p>
              <Button onClick={generateQRCode}>Tentar Novamente</Button>
            </div>
          )}

          {!isLoading && paymentStatus === 'confirmed' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-green-600">Pagamento Confirmado!</p>
              <p className="text-sm text-muted-foreground text-center">
                Seu pedido foi confirmado e você pode prosseguir com o WhatsApp.
              </p>
            </div>
          )}

          {!isLoading && paymentStatus === 'pending' && qrCodeBase64 && (
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
                  <p className="text-sm font-medium text-center">
                    Ou copie o código PIX:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={qrCode}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs bg-muted rounded-md border border-input"
                    />
                    <Button
                      onClick={handleCopyQRCode}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-xs text-center text-muted-foreground">
                Valor: R$ {amount.toFixed(2)}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
