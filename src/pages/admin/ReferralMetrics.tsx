import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  Ticket,
  Trophy,
  Target,
  Award,
} from 'lucide-react';
import { useReferralMetrics } from '@/hooks/useReferralMetrics';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const COLORS = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#B9F2FF'];

export default function ReferralMetrics() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { data: metrics, isLoading } = useReferralMetrics();

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

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Métricas do Programa de Indicações</h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada do desempenho do programa
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Métricas do Programa de Indicações</h1>
        <p className="text-muted-foreground mt-1">
          Análise detalhada do desempenho do programa
        </p>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Indicações</p>
              <p className="text-3xl font-bold mt-2">{metrics.totalReferrals}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              <p className="text-3xl font-bold mt-2">
                {metrics.conversionRate.toFixed(1)}%
              </p>
            </div>
            <Target className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.confirmedReferrals} confirmadas
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cupons Gerados</p>
              <p className="text-3xl font-bold mt-2">{metrics.totalCoupons}</p>
            </div>
            <Ticket className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.usedCoupons} utilizados
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pontos Distribuídos</p>
              <p className="text-3xl font-bold mt-2">
                {metrics.totalPointsDistributed}
              </p>
            </div>
            <Award className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tendência Mensal */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendência Mensal
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.monthlyMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="referrals" name="Indicações" fill="#3b82f6" />
              <Bar dataKey="confirmed" name="Confirmadas" fill="#22c55e" />
              <Bar dataKey="coupons" name="Cupons" fill="#a855f7" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribuição por Tier */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Distribuição por Nível
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.tierDistribution}
                dataKey="count"
                nameKey="tier.name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.tier.name}: ${entry.count}`}
              >
                {metrics.tierDistribution.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Indicadores */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top 10 Indicadores
        </h3>
        <div className="space-y-3">
          {metrics.topReferrers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum indicador encontrado ainda
            </p>
          ) : (
            metrics.topReferrers.map((referrer: any, index: number) => {
              const tier = referrer.referral_tiers;
              const profile = referrer.profiles;
              
              return (
                <div
                  key={referrer.user_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-base">
                        {profile?.full_name || 'Usuário Anônimo'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary">
                          {referrer.total_successful_referrals}
                        </span>{' '}
                        indicações confirmadas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-lg text-primary">
                        {referrer.total_earned} pts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total acumulado
                      </p>
                    </div>
                    {tier && (
                      <Badge
                        className="h-7"
                        style={{
                          backgroundColor: tier.badge_color,
                          color: '#fff',
                        }}
                      >
                        {tier.name}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
