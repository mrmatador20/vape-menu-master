import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Shield, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { ActivityLog, ActivityType, AuditSeverity } from '@/hooks/useActivityLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';

const AuditLogs = () => {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', filterType, filterSeverity],
    queryFn: async () => {
      let query = supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filterType !== 'all') {
        query = query.eq('activity_type', filterType);
      }

      if (filterSeverity !== 'all') {
        query = query.eq('severity', filterSeverity);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  const filteredLogs = logs?.filter((log) => {
    if (!searchTerm) return true;
    return (
      log.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.activity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getSeverityIcon = (severity?: AuditSeverity) => {
    switch (severity) {
      case 'critical':
        return <Shield className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (severity?: AuditSeverity) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-warning/10 text-warning">Alerta</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const getActivityLabel = (type: ActivityType) => {
    const labels: Record<ActivityType, string> = {
      login: 'Login',
      login_failed: 'Falha no Login',
      password_changed: 'Senha Alterada',
      mfa_enabled: 'MFA Ativado',
      mfa_disabled: 'MFA Desativado',
      mfa_backup_code_used: 'Código de Backup MFA Usado',
      logout: 'Logout',
      profile_updated: 'Perfil Atualizado',
      address_added: 'Endereço Adicionado',
      address_updated: 'Endereço Atualizado',
      address_deleted: 'Endereço Excluído',
      order_created: 'Pedido Criado',
      order_cancelled: 'Pedido Cancelado',
      review_created: 'Avaliação Criada',
      review_updated: 'Avaliação Atualizada',
      review_deleted: 'Avaliação Excluída',
      admin_product_created: 'Produto Criado (Admin)',
      admin_product_updated: 'Produto Atualizado (Admin)',
      admin_product_deleted: 'Produto Excluído (Admin)',
      admin_order_status_changed: 'Status do Pedido Alterado (Admin)',
      admin_settings_changed: 'Configurações Alteradas (Admin)',
      sensitive_data_accessed: 'Dados Sensíveis Acessados',
      unauthorized_access_attempt: 'Tentativa de Acesso Não Autorizado',
    };
    return labels[type] || type;
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Auditoria e Compliance
          </CardTitle>
          <CardDescription>
            Registro imutável de todas as ações sensíveis dos usuários para monitoramento e compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              placeholder="Buscar por usuário, IP ou ação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="login_failed">Falha no Login</SelectItem>
                <SelectItem value="password_changed">Senha Alterada</SelectItem>
                <SelectItem value="profile_updated">Perfil Atualizado</SelectItem>
                <SelectItem value="order_created">Pedido Criado</SelectItem>
                <SelectItem value="admin_product_created">Produto Criado (Admin)</SelectItem>
                <SelectItem value="admin_order_status_changed">Status Alterado (Admin)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as severidades</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Alerta</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Severidade</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário ID</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Recurso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum registro de auditoria encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(log.severity)}
                          {getSeverityBadge(log.severity)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getActivityLabel(log.activity_type)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.ip_address || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {log.resource_type ? (
                          <span className="font-mono text-xs">
                            {log.resource_type}
                            {log.resource_id && `: ${log.resource_id.substring(0, 8)}...`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Retenção:</strong> Os registros de auditoria são mantidos por 5 anos para compliance.
            </p>
            <p>
              <strong>Imutabilidade:</strong> Os logs não podem ser modificados ou excluídos para garantir a integridade.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
