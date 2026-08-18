import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { useSettingByKey, useUpdateSetting } from '@/hooks/useSettings';

export default function BalcaoPixFallbackSettings() {
  const { data: cpfSetting, isLoading: loadingCpf } = useSettingByKey('balcao_pix_fallback_cpf');
  const { data: nameSetting, isLoading: loadingName } = useSettingByKey('balcao_pix_fallback_name');
  const update = useUpdateSetting();

  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (cpfSetting) setCpf(cpfSetting.value ?? '');
  }, [cpfSetting]);

  useEffect(() => {
    if (nameSetting) setName(nameSetting.value ?? '');
  }, [nameSetting]);

  const isLoading = loadingCpf || loadingName;
  const digits = cpf.replace(/\D/g, '');
  const valid = digits.length === 11 || digits.length === 14;

  const save = async () => {
    if (!valid) {
      toast.error('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido');
      return;
    }
    await update.mutateAsync({
      key: 'balcao_pix_fallback_cpf',
      value: digits,
      description: 'CPF/CNPJ do titular da loja usado no Pix Balcão quando o cliente não informa o documento',
    });
    await update.mutateAsync({
      key: 'balcao_pix_fallback_name',
      value: name.trim() || 'Cliente Balcão',
      description: 'Nome do titular usado no Pix Balcão quando o cliente não informa os dados',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" /> Pix Balcão — Dados padrão
        </CardTitle>
        <CardDescription>
          Usados automaticamente quando o operador gera o Pix no balcão sem informar o CPF do cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="balcao-pix-cpf">CPF/CNPJ do titular</Label>
            <Input
              id="balcao-pix-cpf"
              inputMode="numeric"
              maxLength={14}
              placeholder="Somente números"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 14))}
            />
            {!valid && cpf.length > 0 && (
              <p className="text-xs text-destructive">CPF deve ter 11 dígitos ou CNPJ 14 dígitos.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="balcao-pix-name">Nome do titular</Label>
            <Input
              id="balcao-pix-name"
              maxLength={100}
              placeholder="Cliente Balcão"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={save} disabled={update.isPending || !valid}>
          {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
