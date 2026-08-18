import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Pencil, BarChart3, Copy, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DiscountFormDialog } from "@/components/admin/DiscountFormDialog";
import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";

export default function AdminDiscounts() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const copyInfluencerLink = (code: string) => {
    const url = `${window.location.origin}/?cupom=${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de indicação copiado!');
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const { data: discounts, isLoading } = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: async () => {
      // Fetch discounts
      const { data: discountsData, error: discountsError } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (discountsError) throw discountsError;
      if (!discountsData) return [];

      // Fetch usage counts for all discounts
      const { data: usageCounts, error: usageError } = await supabase
        .from('discount_usage')
        .select('discount_id');

      if (usageError) throw usageError;

      // Count usage per discount
      const usageMap = new Map<string, number>();
      usageCounts?.forEach(usage => {
        const count = usageMap.get(usage.discount_id) || 0;
        usageMap.set(usage.discount_id, count + 1);
      });

      // Combine data
      return discountsData.map(discount => ({
        ...discount,
        usage_count: usageMap.get(discount.id) || 0
      }));
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestão de Descontos</h1>
          <p className="text-muted-foreground">Crie e gerencie cupons de desconto</p>
        </div>
        <div className="w-full grid grid-cols-2 gap-2 sm:w-auto sm:flex">
          <Button variant="outline" className="whitespace-nowrap" onClick={() => navigate('/546498@18/influencer-metrics')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver Métricas
          </Button>
          <Button className="whitespace-nowrap" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Desconto
          </Button>
        </div>
      </div>

      {/* Cupons de Parceiros - destaque */}
      {discounts && discounts.filter((d: any) => d.is_influencer_coupon).length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Cupons Ativos de Parceiros
            </CardTitle>
            <CardDescription>Cupons vinculados a influencers — clique para copiar o link de indicação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {discounts
                .filter((d: any) => d.is_influencer_coupon)
                .map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
                    <div>
                      <div className="font-mono font-semibold">{d.code}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.influencer_name || 'Sem responsável'} · {d.usage_count || 0} usos
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyInfluencerLink(d.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <section className="min-w-0 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Cupons de Desconto</h2>
          <p className="text-sm text-muted-foreground">Lista de todos os descontos ativos e inativos</p>
        </div>

          {/* Cards exclusivos do mobile: sem qualquer estrutura de tabela */}
          <div className="flex flex-col gap-3 md:hidden">
            {discounts?.map((discount) => (
              <Card key={discount.id} className="p-4 space-y-3 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold break-all text-sm">
                    Cupom: {discount.code}
                  </span>
                  <Badge variant={discount.is_active ? "default" : "secondary"} className="shrink-0">
                    {discount.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Parceiro:</span>
                    <span className="text-right break-words">
                      {discount.is_influencer_coupon ? discount.influencer_name || 'Parceiro' : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Tipo:</span>
                    <span>{discount.type === 'percent' ? 'Percentual' : 'Valor Fixo'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Valor:</span>
                    <span className="font-medium">
                      {discount.type === 'percent' ? `${discount.value}%` : `R$ ${discount.value}`}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Usos acumulados:</span>
                    <span className="whitespace-nowrap font-medium">
                      {discount.usage_count || 0}{discount.max_uses ? ` / ${discount.max_uses}` : ''}
                    </span>
                  </div>
                </div>
                {discount.max_uses && discount.usage_count >= discount.max_uses && (
                  <Badge variant="destructive" className="w-fit">Esgotado</Badge>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingDiscount(discount);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(discount.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </div>
              </Card>
            ))}
            {!discounts?.length && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum desconto cadastrado. Clique em “Novo Desconto”.
              </p>
            )}
          </div>

          {/* Tabela e seu wrapper de overflow existem apenas no desktop */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cupom</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Agendamento</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Usos acumulados</TableHead>
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
                    {discount.is_influencer_coupon ? (
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        {discount.influencer_name || 'Parceiro'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
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
                    <span className={discount.max_uses ? 'font-medium' : ''}>
                      {discount.usage_count || 0}
                      {discount.max_uses && ` / ${discount.max_uses}`}
                    </span>
                    {discount.max_uses && discount.usage_count >= discount.max_uses && (
                      <Badge variant="destructive" className="ml-2">Esgotado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={discount.is_active ? "default" : "secondary"}>
                      {discount.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {discount.is_influencer_coupon && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Copiar link de indicação"
                          onClick={() => copyInfluencerLink(discount.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingDiscount(discount);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(discount.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
      </section>

      <DiscountFormDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingDiscount(null);
        }}
        discount={editingDiscount}
      />
    </div>
  );
}
