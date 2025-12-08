import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, AlertTriangle, Activity, Lock, TrendingUp, TrendingDown, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { useSecurityMetrics } from '@/hooks/useSecurityMetrics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import SecurityReportExport from '@/components/admin/SecurityReportExport';
import AnomalyAlertSettings from '@/components/admin/AnomalyAlertSettings';
import FieldEncryptionInfo from '@/components/admin/FieldEncryptionInfo';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];

const SecurityDashboard = () => {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { data: metrics, isLoading, refetch } = useSecurityMetrics();
  const [realtimeAlerts, setRealtimeAlerts] = useState<any[]>([]);

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

  // Real-time subscription for critical events
  useEffect(() => {
    const channel = supabase
      .channel('security-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activity_logs',
          filter: 'severity=in.(warning,critical)'
        },
        (payload) => {
          const newAlert = {
            id: payload.new.id,
            type: payload.new.activity_type,
            severity: payload.new.severity,
            timestamp: payload.new.created_at,
            userId: payload.new.user_id
          };
          
          setRealtimeAlerts(prev => [newAlert, ...prev].slice(0, 10));
          
          toast({
            title: '🚨 Alerta de Segurança',
            description: `Nova atividade ${payload.new.severity}: ${payload.new.activity_type}`,
            variant: payload.new.severity === 'critical' ? 'destructive' : 'default',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Shield className="h-8 w-8 text-green-500" />;
    if (score >= 60) return <Shield className="h-8 w-8 text-yellow-500" />;
    return <AlertTriangle className="h-8 w-8 text-red-500" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      critical: { variant: 'destructive', label: 'Crítico' },
      high: { variant: 'destructive', label: 'Alto' },
      medium: { variant: 'secondary', label: 'Médio' },
      low: { variant: 'outline', label: 'Baixo' },
    };
    const config = variants[severity] || variants.low;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const securityData = [
    { name: 'Seguro', value: metrics?.securityScore || 0, fill: '#10b981' },
    { name: 'Risco', value: 100 - (metrics?.securityScore || 0), fill: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Security Score */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Monitoramento de Segurança
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise em tempo real de ameaças e atividades suspeitas
          </p>
        </div>
        <Button onClick={() => navigate('/admin/audit-logs')} variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          Ver Logs Completos
        </Button>
      </div>

      {/* Real-time Alerts Banner */}
      {realtimeAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{realtimeAlerts.length} alertas em tempo real</strong> - Última atividade: {format(new Date(realtimeAlerts[0].timestamp), 'HH:mm:ss')}
          </AlertDescription>
        </Alert>
      )}

      {/* Security Score Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Índice de Segurança Geral
          </CardTitle>
          <CardDescription>Pontuação baseada em análise de riscos e ameaças</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getScoreIcon(metrics?.securityScore || 0)}
              <div>
                <div className={`text-5xl font-bold ${getScoreColor(metrics?.securityScore || 0)}`}>
                  {metrics?.securityScore || 0}
                </div>
                <p className="text-sm text-muted-foreground">de 100 pontos</p>
              </div>
            </div>
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={securityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {securityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tentativas de Login</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.loginAttempts.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500">{metrics?.loginAttempts.failed || 0} falhas</span>
              {' / '}
              <span className="text-green-500">{metrics?.loginAttempts.successful || 0} sucessos</span>
            </p>
            <div className="flex items-center text-xs mt-2">
              {(metrics?.loginAttempts.failed || 0) > (metrics?.loginAttempts.successful || 0) ? (
                <>
                  <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">Alta taxa de falhas</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">Taxa normal</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Bloqueados</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.blockedIPs.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Rate limiting ativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalias Detectadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.anomalies.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Login Attempts Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Tentativas de Login (24h)</CardTitle>
          <CardDescription>Distribuição de logins bem-sucedidos vs. falhas por hora</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics?.loginAttempts.trend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="successful" stroke="#10b981" name="Sucessos" strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Falhas" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomalies List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Anomalias e Padrões Suspeitos
          </CardTitle>
          <CardDescription>Comportamentos detectados automaticamente pelo sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics?.anomalies.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              ✓ Nenhuma anomalia detectada
            </p>
          ) : (
            <div className="space-y-3">
              {metrics?.anomalies.map((anomaly, index) => (
                <Alert key={index} variant={anomaly.severity === 'critical' ? 'destructive' : 'default'}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(anomaly.severity)}
                        <span className="font-semibold">{anomaly.description}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tipo: {anomaly.type} • {format(new Date(anomaly.timestamp), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Critical Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Críticas Recentes</CardTitle>
          <CardDescription>Últimas 20 ações de alta severidade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics?.criticalActions.slice(0, 20).map((action) => (
              <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getSeverityBadge(action.severity)}
                  <div>
                    <p className="text-sm font-medium">{action.activity_type}</p>
                    <p className="text-xs text-muted-foreground">
                      Usuário: {action.user_id.substring(0, 8)}... • {format(new Date(action.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blocked IPs Table */}
      <Card>
        <CardHeader>
          <CardTitle>IPs Bloqueados por Rate Limiting</CardTitle>
          <CardDescription>Endereços IP temporariamente bloqueados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics?.blockedIPs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum IP bloqueado no momento
              </p>
            ) : (
              metrics?.blockedIPs.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-mono font-medium">{ip.identifier}</p>
                    <p className="text-xs text-muted-foreground">
                      {ip.attempt_count} tentativas • Ação: {ip.action_type}
                    </p>
                  </div>
                  <Badge variant="destructive">Bloqueado</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      {/* Security Tools Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SecurityReportExport />
        <AnomalyAlertSettings />
      </div>

      {/* Field Encryption Info */}
      <FieldEncryptionInfo />
    </div>
  );
};

export default SecurityDashboard;
