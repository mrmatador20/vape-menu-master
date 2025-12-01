import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAddReferralReward, useUpdateReferralReward, ReferralReward } from "@/hooks/useReferralRewards";
import { useDiscounts } from "@/hooks/useDiscounts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReferralRewardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward?: ReferralReward | null;
}

export const ReferralRewardFormDialog = ({
  open,
  onOpenChange,
  reward,
}: ReferralRewardFormDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsRequired, setPointsRequired] = useState('');
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const addReward = useAddReferralReward();
  const updateReward = useUpdateReferralReward();
  const { data: discounts } = useDiscounts();

  useEffect(() => {
    if (reward) {
      setName(reward.name);
      setDescription(reward.description || '');
      setPointsRequired(reward.points_required.toString());
      setDiscountCode(reward.discount_code);
      setIsActive(reward.is_active);
    } else {
      setName('');
      setDescription('');
      setPointsRequired('');
      setDiscountCode(null);
      setIsActive(true);
    }
  }, [reward, open]);

  const handleSubmit = async () => {
    if (!name || !pointsRequired) return;

    const rewardData = {
      name,
      description: description || null,
      points_required: parseInt(pointsRequired),
      discount_code: discountCode,
      is_active: isActive,
    };

    if (reward) {
      await updateReward.mutateAsync({ id: reward.id, ...rewardData });
    } else {
      await addReward.mutateAsync(rewardData);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {reward ? 'Editar Recompensa' : 'Nova Recompensa'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Recompensa *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cupom de R$ 10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a recompensa..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Pontos Necessários *</Label>
            <Input
              id="points"
              type="number"
              min="1"
              value={pointsRequired}
              onChange={(e) => setPointsRequired(e.target.value)}
              placeholder="100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Cupom de Desconto (Opcional)</Label>
            <Select value={discountCode || 'none'} onValueChange={(value) => setDiscountCode(value === 'none' ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cupom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum cupom</SelectItem>
                {discounts?.map((discount) => (
                  <SelectItem key={discount.id} value={discount.code}>
                    {discount.code} ({discount.type === 'percent' ? `${discount.value}%` : `R$ ${discount.value}`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Recompensa ativa</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!name || !pointsRequired || addReward.isPending || updateReward.isPending}
          >
            {reward ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};