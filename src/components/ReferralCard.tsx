import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Trophy, TrendingUp } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useReferralPoints, useReferralTransactions } from "@/hooks/useReferralPoints";
import { useReferralRewards, useRedeemReward } from "@/hooks/useReferralRewards";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export const ReferralCard = () => {
  const { profile, isLoading: profileLoading } = useProfile();
  const { data: points, isLoading: pointsLoading } = useReferralPoints();
  const { data: transactions, isLoading: transactionsLoading } = useReferralTransactions();
  const { data: rewards, isLoading: rewardsLoading } = useReferralRewards();
  const redeemReward = useRedeemReward();

  const handleCopyCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success('Código copiado para área de transferência!');
    }
  };

  const handleRedeemReward = (rewardId: string) => {
    redeemReward.mutate(rewardId);
  };

  if (profileLoading || pointsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Código de Indicação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Seu Código de Indicação
          </CardTitle>
          <CardDescription>
            Compartilhe com amigos e ganhe pontos a cada compra deles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Seu código:</p>
              <p className="text-2xl font-bold tracking-wider">{profile?.referral_code}</p>
            </div>
            <Button onClick={handleCopyCode} variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saldo de Pontos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Seus Pontos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Saldo Atual</p>
              <p className="text-3xl font-bold text-primary">{points?.points_balance || 0}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Ganho</p>
              <p className="text-2xl font-semibold">{points?.total_earned || 0}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Resgatado</p>
              <p className="text-2xl font-semibold">{points?.total_redeemed || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recompensas Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Recompensas Disponíveis
          </CardTitle>
          <CardDescription>
            Troque seus pontos por cupons de desconto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rewardsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : rewards && rewards.length > 0 ? (
            <div className="space-y-3">
              {rewards.map((reward) => {
                const canRedeem = (points?.points_balance || 0) >= reward.points_required;
                return (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{reward.name}</p>
                      {reward.description && (
                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                      )}
                      <Badge variant="secondary" className="mt-2">
                        {reward.points_required} pontos
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleRedeemReward(reward.id)}
                      disabled={!canRedeem || redeemReward.isPending}
                      variant={canRedeem ? "default" : "outline"}
                    >
                      {canRedeem ? 'Resgatar' : 'Pontos Insuficientes'}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma recompensa disponível no momento
            </p>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Transações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Histórico de Pontos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border-b last:border-0">
                  <div>
                    <p className="font-medium capitalize">
                      {transaction.transaction_type === 'earned' && 'Ganhou Pontos'}
                      {transaction.transaction_type === 'redeemed' && 'Resgatou Recompensa'}
                      {transaction.transaction_type === 'adjusted' && 'Ajuste Manual'}
                      {transaction.transaction_type === 'revoked' && 'Pontos Revogados'}
                    </p>
                    {transaction.notes && (
                      <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant={transaction.points_amount > 0 ? "default" : "secondary"}>
                    {transaction.points_amount > 0 ? '+' : ''}{transaction.points_amount}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma transação ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};