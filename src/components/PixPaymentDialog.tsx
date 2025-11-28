import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PixPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  amount: number;
}

export const PixPaymentDialog = ({ open, onOpenChange, orderId, amount }: PixPaymentDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pixData, setPixData] = useState<{
    pixCode: string;
    pixQrCodeUrl: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerateQrCode = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: { orderId, amount }
      });

      if (error) throw error;

      if (data.success) {
        setPixData({
          pixCode: data.pixCode,
          pixQrCodeUrl: data.pixQrCodeUrl,
          expiresAt: data.expiresAt,
        });
        toast({
          title: "QR Code gerado com sucesso",
          description: "Escaneie o código ou copie o código PIX para pagar",
        });
      } else {
        throw new Error(data.error || 'Erro ao gerar QR Code');
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast({
        title: "Erro ao gerar QR Code",
        description: "Não foi possível gerar o código PIX. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole o código no seu app de pagamento",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Pagamento via PIX</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou copie o código PIX para realizar o pagamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!pixData ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <QrCode className="h-16 w-16 text-muted-foreground" />
              <p className="text-center text-sm text-muted-foreground">
                Clique no botão abaixo para gerar o QR Code do seu pagamento
              </p>
              <Button
                onClick={handleGenerateQrCode}
                disabled={isGenerating}
                size="lg"
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando QR Code...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Criar QR Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Code Image */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={pixData.pixQrCodeUrl}
                  alt="QR Code PIX"
                  className="w-64 h-64 object-contain"
                />
              </div>

              {/* PIX Code Copy */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Código PIX (Copia e Cola)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixData.pixCode}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted font-mono"
                  />
                  <Button
                    onClick={handleCopyPixCode}
                    variant="outline"
                    size="icon"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expiration Info */}
              {pixData.expiresAt && (
                <p className="text-xs text-center text-muted-foreground">
                  Código expira em: {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
                </p>
              )}

              {/* Instructions */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Como pagar:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Abra o app do seu banco</li>
                  <li>Escolha pagar com PIX</li>
                  <li>Escaneie o QR Code ou cole o código</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateQrCode}
                  variant="outline"
                  className="flex-1"
                  disabled={isGenerating}
                >
                  Gerar Novo Código
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
