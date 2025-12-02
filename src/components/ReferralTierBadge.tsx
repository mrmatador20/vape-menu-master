import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Trophy, TrendingUp } from 'lucide-react';
import { useCurrentUserTier, useReferralTiers } from '@/hooks/useReferralTiers';
import { Skeleton } from '@/components/ui/skeleton';

export const ReferralTierBadge = () => {
  const { data: userTierData, isLoading: isLoadingUser } = useCurrentUserTier();
  const { data: allTiers, isLoading: isLoadingTiers } = useReferralTiers();

  if (isLoadingUser || isLoadingTiers) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!userTierData) {
    return null;
  }

  const currentTier = userTierData.current_tier as any;
  const nextTier = allTiers?.find(
    (tier) => tier.min_referrals > (userTierData.total_successful_referrals || 0)
  );

  const progressToNextTier = nextTier
    ? ((userTierData.total_successful_referrals || 0) / nextTier.min_referrals) * 100
    : 100;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Seu Nível de Indicação</h3>
        </div>
        {currentTier && (
          <Badge
            style={{
              backgroundColor: currentTier.badge_color,
              color: '#fff',
            }}
            className="text-sm font-bold px-3 py-1"
          >
            {currentTier.name}
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Indicações Confirmadas</span>
          <span className="font-semibold">
            {userTierData.total_successful_referrals || 0}
          </span>
        </div>

        {currentTier && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Multiplicador de Pontos</span>
            <span className="font-semibold text-primary">
              {currentTier.points_multiplier}x
            </span>
          </div>
        )}

        {nextTier && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Próximo Nível</span>
                <span className="font-semibold">{nextTier.name}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progressToNextTier, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {userTierData.total_successful_referrals || 0} /{' '}
                  {nextTier.min_referrals} indicações
                </span>
                <span>{Math.round(progressToNextTier)}%</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Faltam{' '}
                <span className="font-semibold text-foreground">
                  {nextTier.min_referrals - (userTierData.total_successful_referrals || 0)}
                </span>{' '}
                indicações confirmadas para alcançar{' '}
                <span className="font-semibold text-foreground">{nextTier.name}</span> e
                ganhar{' '}
                <span className="font-semibold text-primary">
                  {nextTier.points_multiplier}x
                </span>{' '}
                pontos por indicação!
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
