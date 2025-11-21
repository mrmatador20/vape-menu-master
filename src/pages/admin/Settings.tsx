import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  
  const [freeShippingValue, setFreeShippingValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar valor quando os dados carregarem
  useState(() => {
    if (settings) {
      const freeShippingSetting = settings.find(s => s.key === 'free_shipping_min_value');
      if (freeShippingSetting) {
        setFreeShippingValue(freeShippingSetting.value);
      }
    }
  });

  // Atualizar valor quando settings mudar
  if (settings && !freeShippingValue) {
    const freeShippingSetting = settings.find(s => s.key === 'free_shipping_min_value');
    if (freeShippingSetting && freeShippingSetting.value !== freeShippingValue) {
      setFreeShippingValue(freeShippingSetting.value);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await updateSetting.mutateAsync({
        key: 'free_shipping_min_value',
        value: freeShippingValue,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
        <p className="text-muted-foreground mt-1">
          Configure as opções gerais da loja
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Frete Grátis</h2>
            <div className="space-y-2">
              <Label htmlFor="freeShippingValue">
                Valor Mínimo para Frete Grátis (R$)
              </Label>
              <Input
                id="freeShippingValue"
                type="number"
                step="0.01"
                min="0"
                value={freeShippingValue}
                onChange={(e) => setFreeShippingValue(e.target.value)}
                placeholder="100.00"
                required
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Pedidos com subtotal acima deste valor terão frete grátis automaticamente.
                Defina como 0 para desabilitar o frete grátis.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
