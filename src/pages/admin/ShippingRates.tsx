import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  useShippingRates,
  useAddShippingRate,
  useUpdateShippingRate,
  useDeleteShippingRate,
  ShippingRate,
} from '@/hooks/useShippingRates';
import { ShippingRateFormDialog } from '@/components/admin/ShippingRateFormDialog';

export default function ShippingRates() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);

  const { data: rates, isLoading } = useShippingRates();
  const addRate = useAddShippingRate();
  const updateRate = useUpdateShippingRate();
  const deleteRate = useDeleteShippingRate();

  const handleSubmit = (data: { cep: string; price: number }) => {
    if (editingRate) {
      updateRate.mutate({ id: editingRate.id, data });
    } else {
      addRate.mutate(data);
    }
    setEditingRate(null);
  };

  const handleEdit = (rate: ShippingRate) => {
    setEditingRate(rate);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta taxa de entrega?')) {
      deleteRate.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingRate(null);
    setDialogOpen(true);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Taxas de Entrega</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os valores de entrega por CEP
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Taxa
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CEP</TableHead>
              <TableHead>Valor da Entrega</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates && rates.length > 0 ? (
              rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">
                    {rate.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}
                  </TableCell>
                  <TableCell>
                    R$ {Number(rate.price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(rate)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rate.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhuma taxa cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <ShippingRateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        editingRate={editingRate}
      />
    </div>
  );
}
