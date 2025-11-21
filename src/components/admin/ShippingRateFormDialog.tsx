import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShippingRate } from '@/hooks/useShippingRates';

interface ShippingRateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { cep: string; price: number }) => void;
  editingRate?: ShippingRate | null;
}

export function ShippingRateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  editingRate,
}: ShippingRateFormDialogProps) {
  const [cep, setCep] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (editingRate) {
      setCep(editingRate.cep);
      setPrice(editingRate.price.toString());
    } else {
      setCep('');
      setPrice('');
    }
  }, [editingRate, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      cep: cep.replace(/\D/g, ''),
      price: parseFloat(price),
    });
    onOpenChange(false);
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingRate ? 'Editar Taxa de Entrega' : 'Nova Taxa de Entrega'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              value={cep}
              onChange={handleCepChange}
              placeholder="00000-000"
              maxLength={9}
              required
            />
          </div>
          <div>
            <Label htmlFor="price">Valor da Entrega (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingRate ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
