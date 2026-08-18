import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildPixBrCode } from '@/lib/pixBrCode';
import { usePixBalcaoConfig } from '@/hooks/usePixBalcaoConfig';

interface Props {
  amount: number;
  txid?: string;
}

export function PixBalcaoQr({ amount, txid }: Props) {
  const { data: config, isLoading } = usePixBalcaoConfig();
  const [dataUrl, setDataUrl] = useState<string>('');
  const [payload, setPayload] = useState<string>('');

  useEffect(() => {
    if (!config?.pix_balcao_key) return;
    const code = buildPixBrCode({
      key: config.pix_balcao_key,
      merchantName: config.pix_balcao_merchant_name,
      merchantCity: config.pix_balcao_merchant_city,
      amount,
      txid,
    });
    setPayload(code);
    QRCode.toDataURL(code, { width: 320, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(''));
  }, [config, amount, txid]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-md border p-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!config?.pix_balcao_key) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Nenhuma chave Pix configurada. Cadastre em Configurações → Pix Balcão para exibir o QR Code.
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      toast.success('Código Pix copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="text-xs text-muted-foreground text-center">
        Peça para o cliente escanear o QR Code
      </div>
      {dataUrl ? (
        <img src={dataUrl} alt="QR Code Pix do balcão" className="mx-auto h-48 w-48 rounded bg-card" />
      ) : (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={copy}>
        <Copy className="h-4 w-4 mr-2" /> Copiar código Pix
      </Button>
    </div>
  );
}
