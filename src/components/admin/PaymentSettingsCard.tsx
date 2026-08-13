import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CreditCard, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useBalcaoRole } from '@/hooks/useUserRole';
import {
  usePaymentSettings,
  useUpdatePaymentSettings,
} from '@/hooks/usePaymentSettings';
import { buildInstallmentOptions } from '@/lib/installments';

export default function PaymentSettingsCard() {
  const { roles, isLoading: roleLoading } = useBalcaoRole();
  const isSuperAdmin = roles.includes('super_admin');
  const { data: settings, isLoading } = usePaymentSettings();
  const update = useUpdatePaymentSettings();

  const [free, setFree] = useState('2');
  const [max, setMax] = useState('12');
  const [rate, setRate] = useState('2.99');

  useEffect(() => {
    if (settings) {
      setFree(String(settings.max_interest_free_installments));
      setMax(String(settings.max_total_installments));
      setRate(String(settings.monthly_interest_rate));
    }
  }, [settings]);

  if (roleLoading || isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Pagamentos — Parcelamento no cartão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Acesso negado</AlertTitle>
            <AlertDescription>
              Apenas o super administrador pode visualizar e editar as regras de parcelamento.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const nFree = parseInt(free, 10);
  const nMax = parseInt(max, 10);
  const nRate = parseFloat(rate);

  const validate = () => {
    if (isNaN(nFree) || nFree < 1 || nFree > 12) return 'Parcelas sem juros deve estar entre 1 e 12.';
    if (isNaN(nMax) || nMax < 1 || nMax > 12) return 'Máximo de parcelas deve estar entre 1 e 12.';
    if (nFree > nMax) return 'Parcelas sem juros não pode ser maior que o máximo de parcelas.';
    if (isNaN(nRate) || nRate < 0 || nRate > 15) return 'Taxa mensal deve estar entre 0% e 15%.';
    return null;
  };

  const error = validate();

  const handleSave = async () => {
    if (error) {
      toast.error(error);
      return;
    }
    try {
      await update.mutateAsync({
        current: settings ?? null,
        values: {
          max_interest_free_installments: nFree,
          max_total_installments: nMax,
          monthly_interest_rate: nRate,
        },
      });
      toast.success('Regras de parcelamento atualizadas');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar as regras');
    }
  };

  const preview = error
    ? []
    : buildInstallmentOptions(1000, {
        maxInterestFree: nFree,
        maxTotal: nMax,
        monthlyRate: nRate / 100,
      });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" /> Pagamentos — Parcelamento no cartão
        </CardTitle>
        <CardDescription>
          Define as regras aplicadas no checkout e recalculadas no servidor antes de enviar ao Asaas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="free">Parcelas sem juros</Label>
            <Input id="free" type="number" min={1} max={12} value={free} onChange={(e) => setFree(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max">Máximo de parcelas no cartão</Label>
            <Input id="max" type="number" min={1} max={12} value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Taxa de juros mensal (%)</Label>
            <Input id="rate" type="number" step="0.01" min={0} max={15} value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {preview.length > 0 && (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-2">Simulação para R$ 1.000,00</p>
            <div className="grid gap-1 sm:grid-cols-2 text-sm text-muted-foreground">
              {preview.map((o) => (
                <span key={o.n}>
                  {o.n}x de R$ {o.installmentValue.toFixed(2)} {o.hasInterest ? '(com juros)' : 'sem juros'}
                </span>
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={!!error || update.isPending}>
          {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar regras
        </Button>
      </CardContent>
    </Card>
  );
}
