import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Gift, TrendingUp, Users, Settings } from "lucide-react";
import { useAllReferralPoints, useAdjustPoints } from "@/hooks/useReferralPoints";
import { useAllReferralRewards, useDeleteReferralReward } from "@/hooks/useReferralRewards";
import { ReferralRewardFormDialog } from "@/components/admin/ReferralRewardFormDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSettingByKey, useUpdateSetting } from "@/hooks/useSettings";

export default function Referrals() {
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);
  const [adjustPointsDialogOpen, setAdjustPointsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pointsAdjustment, setPointsAdjustment] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [deleteRewardId, setDeleteRewardId] = useState<string | null>(null);
  const [pointsPerOrder, setPointsPerOrder] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');

  const { data: allPoints, isLoading: pointsLoading } = useAllReferralPoints();
  const { data: rewards, isLoading: rewardsLoading } = useAllReferralRewards();
  const { data: pointsSetting, isLoading: settingLoading } = useSettingByKey('referral_points_per_order');
  const { data: minValueSetting, isLoading: minValueLoading } = useSettingByKey('referral_min_order_value');
  const adjustPoints = useAdjustPoints();
  const deleteReward = useDeleteReferralReward();
  const updateSetting = useUpdateSetting();

  const handleEditReward = (reward: any) => {
    setEditingReward(reward);
    setRewardDialogOpen(true);
  };

  const handleNewReward = () => {
    setEditingReward(null);
    setRewardDialogOpen(true);
  };

  const handleAdjustPoints = (userId: string) => {
    setSelectedUserId(userId);
    setPointsAdjustment('');
    setAdjustmentNotes('');
    setAdjustPointsDialogOpen(true);
  };

  const handleConfirmAdjustment = async () => {
    if (!selectedUserId || !pointsAdjustment || !adjustmentNotes) return;

    await adjustPoints.mutateAsync({
      userId: selectedUserId,
      pointsAmount: parseInt(pointsAdjustment),
      notes: adjustmentNotes,
    });

    setAdjustPointsDialogOpen(false);
    setSelectedUserId(null);
    setPointsAdjustment('');
    setAdjustmentNotes('');
  };

  const handleDeleteReward = async () => {
    if (!deleteRewardId) return;
    await deleteReward.mutateAsync(deleteRewardId);
    setDeleteRewardId(null);
  };

  const handleUpdatePointsPerOrder = async () => {
    const points = parseInt(pointsPerOrder);
    if (isNaN(points) || points < 1) {
      return;
    }
    await updateSetting.mutateAsync({
      key: 'referral_points_per_order',
      value: pointsPerOrder,
    });
  };

  const handleUpdateMinOrderValue = async () => {
    const value = parseFloat(minOrderValue);
    if (isNaN(value) || value < 0) {
      return;
    }
    await updateSetting.mutateAsync({
      key: 'referral_min_order_value',
      value: minOrderValue,
      description: 'Valor mínimo do pedido (em reais) para que o indicador ganhe pontos',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sistema de Indicação</h1>
        <p className="text-muted-foreground">
          Gerencie recompensas, pontos dos clientes e acompanhe o programa de indicação
        </p>
      </div>

      {/* Configuração de Pontos por Indicação */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Configuração de Pontos</CardTitle>
          </div>
          <CardDescription>
            Defina quantos pontos o indicador ganha quando um pedido indicado é confirmado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settingLoading || minValueLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3 items-end max-w-md">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="points_per_order">Pontos por Pedido Confirmado</Label>
                  <Input
                    id="points_per_order"
                    type="number"
                    min="1"
                    value={pointsPerOrder || pointsSetting?.value || '10'}
                    onChange={(e) => setPointsPerOrder(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <Button
                  onClick={handleUpdatePointsPerOrder}
                  disabled={updateSetting.isPending || !pointsPerOrder || parseInt(pointsPerOrder) < 1}
                >
                  Salvar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Valor atual: <strong>{pointsSetting?.value || '10'} pontos</strong> por pedido confirmado
              </p>

              <div className="flex gap-3 items-end max-w-md pt-4 border-t">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="min_order_value">Valor Mínimo do Pedido (R$)</Label>
                  <Input
                    id="min_order_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={minOrderValue || minValueSetting?.value || '50'}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    placeholder="50.00"
                  />
                </div>
                <Button
                  onClick={handleUpdateMinOrderValue}
                  disabled={updateSetting.isPending || !minOrderValue || parseFloat(minOrderValue) < 0}
                >
                  Salvar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Valor atual: <strong>R$ {parseFloat(minValueSetting?.value || '50').toFixed(2)}</strong> - Pedidos abaixo deste valor não geram pontos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="rewards" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Recompensas
          </TabsTrigger>
          <TabsTrigger value="points" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pontos dos Clientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Recompensas</h2>
              <p className="text-sm text-muted-foreground">
                Configure as recompensas que clientes podem resgatar com pontos
              </p>
            </div>
            <Button onClick={handleNewReward}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Recompensa
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {rewardsLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : rewards && rewards.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Pontos</TableHead>
                      <TableHead>Cupom</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell className="font-medium">{reward.name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {reward.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{reward.points_required} pts</Badge>
                        </TableCell>
                        <TableCell>
                          {reward.discount_code ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {reward.discount_code}
                            </code>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={reward.is_active ? "default" : "outline"}>
                            {reward.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditReward(reward)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteRewardId(reward.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-12 text-center">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhuma recompensa cadastrada</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie a primeira recompensa para os clientes resgatarem
                  </p>
                  <Button onClick={handleNewReward}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Recompensa
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Pontos dos Clientes</h2>
            <p className="text-sm text-muted-foreground">
              Visualize e ajuste os pontos de cada cliente
            </p>
          </div>

          <Card>
            <CardContent className="p-0">
              {pointsLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : allPoints && allPoints.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Código de Indicação</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Total Ganho</TableHead>
                      <TableHead>Total Resgatado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPoints.map((point: any) => (
                      <TableRow key={point.id}>
                        <TableCell className="font-medium">
                          {point.profiles?.full_name || 'Usuário sem nome'}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {point.profiles?.referral_code || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="font-bold">
                            {point.points_balance}
                          </Badge>
                        </TableCell>
                        <TableCell>{point.total_earned}</TableCell>
                        <TableCell>{point.total_redeemed}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdjustPoints(point.user_id)}
                          >
                            Ajustar Pontos
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhum cliente com pontos</p>
                  <p className="text-sm text-muted-foreground">
                    Os pontos aparecerão aqui quando os clientes começarem a indicar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reward Form Dialog */}
      <ReferralRewardFormDialog
        open={rewardDialogOpen}
        onOpenChange={setRewardDialogOpen}
        reward={editingReward}
      />

      {/* Adjust Points Dialog */}
      <Dialog open={adjustPointsDialogOpen} onOpenChange={setAdjustPointsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Pontos do Cliente</DialogTitle>
            <DialogDescription>
              Adicione ou remova pontos manualmente. Use valores negativos para remover pontos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="points_adjustment">
                Quantidade de Pontos (+ para adicionar, - para remover)
              </Label>
              <Input
                id="points_adjustment"
                type="number"
                value={pointsAdjustment}
                onChange={(e) => setPointsAdjustment(e.target.value)}
                placeholder="Ex: 50 ou -20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Motivo do Ajuste *</Label>
              <Input
                id="notes"
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder="Ex: Ajuste manual por erro no sistema"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustPointsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAdjustment}
              disabled={!pointsAdjustment || !adjustmentNotes || adjustPoints.isPending}
            >
              Confirmar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Reward Confirmation */}
      <AlertDialog open={!!deleteRewardId} onOpenChange={() => setDeleteRewardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Recompensa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta recompensa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReward}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}