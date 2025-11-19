import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DiscountFormDialog } from "@/components/admin/DiscountFormDialog";
import { useState } from "react";

export default function AdminDiscounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: discounts, isLoading } = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      toast.success('Desconto removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover desconto');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getScheduleLabel = (discount: any) => {
    if (discount.schedule_type === 'permanent') return 'Permanente';
    if (discount.schedule_type === 'hourly') return `${discount.start_time} - ${discount.end_time}`;
    if (discount.schedule_type === 'daily') {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return days[discount.day_of_week];
    }
    return discount.schedule_type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Descontos</h1>
          <p className="text-muted-foreground">Crie e gerencie cupons de desconto</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Desconto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cupons de Desconto</CardTitle>
          <CardDescription>Lista de todos os descontos ativos e inativos</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Agendamento</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts?.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell className="font-mono font-semibold">
                    {discount.code}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {discount.type === 'percent' ? 'Percentual' : 'Fixo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {discount.type === 'percent' 
                      ? `${discount.value}%` 
                      : `R$ ${discount.value}`}
                  </TableCell>
                  <TableCell>{getScheduleLabel(discount)}</TableCell>
                  <TableCell>
                    {discount.valid_until 
                      ? new Date(discount.valid_until).toLocaleDateString('pt-BR')
                      : 'Sem limite'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={discount.is_active ? "default" : "secondary"}>
                      {discount.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(discount.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DiscountFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
