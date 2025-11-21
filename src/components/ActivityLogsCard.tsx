import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { Shield, ShieldCheck, ShieldOff, Key, LogIn, LogOut, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'login':
      return <LogIn className="h-4 w-4 text-green-500" />;
    case 'login_failed':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'password_changed':
      return <Key className="h-4 w-4 text-blue-500" />;
    case 'mfa_enabled':
      return <ShieldCheck className="h-4 w-4 text-green-500" />;
    case 'mfa_disabled':
      return <ShieldOff className="h-4 w-4 text-yellow-500" />;
    case 'logout':
      return <LogOut className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
};

const getActivityLabel = (type: string) => {
  switch (type) {
    case 'login':
      return 'Login realizado';
    case 'login_failed':
      return 'Tentativa de login falhou';
    case 'password_changed':
      return 'Senha alterada';
    case 'mfa_enabled':
      return '2FA ativado';
    case 'mfa_disabled':
      return '2FA desativado';
    case 'logout':
      return 'Logout realizado';
    default:
      return type;
  }
};

const getActivityVariant = (type: string): "default" | "destructive" | "secondary" => {
  switch (type) {
    case 'login':
    case 'mfa_enabled':
      return 'default';
    case 'login_failed':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export const ActivityLogsCard = () => {
  const { logs, isLoading } = useActivityLogs();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Atividade Recente
        </CardTitle>
        <CardDescription>
          Histórico de atividades de segurança da sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Nenhuma atividade registrada ainda</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-0.5">{getActivityIcon(log.activity_type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {getActivityLabel(log.activity_type)}
                      </p>
                      <Badge variant={getActivityVariant(log.activity_type)} className="text-xs">
                        {log.activity_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                    {log.user_agent && (
                      <p className="text-xs text-muted-foreground truncate">
                        {log.user_agent.split(' ').slice(0, 3).join(' ')}
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {log.metadata.error && (
                          <p className="text-destructive">Erro: {log.metadata.error}</p>
                        )}
                        {log.metadata.method && (
                          <p>Método: {log.metadata.method}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Mostrando até 50 atividades mais recentes. Caso detecte alguma atividade suspeita,
            altere sua senha imediatamente e ative o 2FA.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
