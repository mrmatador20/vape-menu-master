import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, QrCode } from 'lucide-react';
import { useUpdateSetting } from '@/hooks/useSettings';
import { usePixBalcaoConfig, PixBalcaoConfig } from '@/hooks/usePixBalcaoConfig';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function PixBalcaoSettingsCard() {
  const { data, isLoading } = usePixBalcaoConfig();
  const updateSetting = useUpdateSetting();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<PixBalcaoConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !values) setValues(data);
  }, [data, values]);

  if (isLoading || !values) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await updateSetting.mutateAsync({ key: 'pix_balcao_key', value: values.pix_balcao_key.trim() });
      await updateSetting.mutateAsync({ key: 'pix_balcao_merchant_name', value: values.pix_balcao_merchant_name.trim() });
      await updateSetting.mutateAsync({ key: 'pix_balcao_merchant_city', value: values.pix_balcao_merchant_city.trim() });
      await queryClient.invalidateQueries({ queryKey: ['pix-balcao-config'] });
      toast.success('Configuração do Pix Balcão salva!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message ?? 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <CardTitle>Pix Balcão (QR Code)</CardTitle>
        </div>
        <CardDescription>
          Chave usada para gerar o QR Code Pix exibido na venda do balcão (PDV).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pix_balcao_key">Chave Pix</Label>
          <Input
            id="pix_balcao_key"
            value={values.pix_balcao_key}
            onChange={(e) => setValues({ ...values, pix_balcao_key: e.target.value })}
            placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pix_balcao_merchant_name">Nome do recebedor</Label>
          <Input
            id="pix_balcao_merchant_name"
            maxLength={25}
            value={values.pix_balcao_merchant_name}
            onChange={(e) => setValues({ ...values, pix_balcao_merchant_name: e.target.value })}
            placeholder="Ex: FOX VELOUR"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pix_balcao_merchant_city">Cidade do recebedor</Label>
          <Input
            id="pix_balcao_merchant_city"
            maxLength={15}
            value={values.pix_balcao_merchant_city}
            onChange={(e) => setValues({ ...values, pix_balcao_merchant_city: e.target.value })}
            placeholder="Ex: JOAO PESSOA"
          />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
