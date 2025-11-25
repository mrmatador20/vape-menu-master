import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Mail, MessageSquare } from 'lucide-react';

export function NotificationPreferencesCard() {
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferências de Notificação
        </CardTitle>
        <CardDescription>
          Configure como você deseja ser notificado sobre eventos de segurança
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Canais de Notificação</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="email-enabled" className="flex flex-col gap-1 cursor-pointer">
                <span>Notificações por E-mail</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Receba alertas de segurança por e-mail
                </span>
              </Label>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) =>
                updatePreferences({ ...preferences, email_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="sms-enabled" className="flex flex-col gap-1 cursor-pointer">
                <span>Notificações por SMS</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Receba alertas críticos por mensagem de texto
                </span>
              </Label>
            </div>
            <Switch
              id="sms-enabled"
              checked={preferences.sms_enabled}
              onCheckedChange={(checked) =>
                updatePreferences({ ...preferences, sms_enabled: checked })
              }
            />
          </div>
        </div>

        <Separator />

        {/* Event Types */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Tipos de Alerta</h3>

          <div className="flex items-center justify-between">
            <Label htmlFor="notify-failed-login" className="flex flex-col gap-1 cursor-pointer">
              <span>Tentativas de Login Falhas</span>
              <span className="text-sm text-muted-foreground font-normal">
                Alerta quando houver falhas de login
              </span>
            </Label>
            <Switch
              id="notify-failed-login"
              checked={preferences.notify_failed_login}
              onCheckedChange={(checked) =>
                updatePreferences({ ...preferences, notify_failed_login: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notify-suspicious-login" className="flex flex-col gap-1 cursor-pointer">
              <span>Login Suspeito</span>
              <span className="text-sm text-muted-foreground font-normal">
                Alerta para logins de localizações não habituais
              </span>
            </Label>
            <Switch
              id="notify-suspicious-login"
              checked={preferences.notify_suspicious_login}
              onCheckedChange={(checked) =>
                updatePreferences({ ...preferences, notify_suspicious_login: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notify-password-change" className="flex flex-col gap-1 cursor-pointer">
              <span>Alteração de Senha</span>
              <span className="text-sm text-muted-foreground font-normal">
                Notificar quando sua senha for alterada
              </span>
            </Label>
            <Switch
              id="notify-password-change"
              checked={preferences.notify_password_change}
              onCheckedChange={(checked) =>
                updatePreferences({ ...preferences, notify_password_change: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notify-account-locked" className="flex flex-col gap-1 cursor-pointer">
              <span>Conta Bloqueada</span>
              <span className="text-sm text-muted-foreground font-normal">
                Alerta quando sua conta for bloqueada temporariamente
              </span>
            </Label>
            <Switch
              id="notify-account-locked"
              checked={preferences.notify_account_locked}
              onCheckedChange={(checked) =>
                updatePreferences({ ...preferences, notify_account_locked: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notify-admin-actions" className="flex flex-col gap-1 cursor-pointer">
              <span>Ações Administrativas</span>
              <span className="text-sm text-muted-foreground font-normal">
                Notificar sobre ações administrativas em sua conta
              </span>
            </Label>
            <Switch
              id="notify-admin-actions"
              checked={preferences.notify_admin_actions}
              onCheckedChange={(checked) =>
                updatePreferences({ ...preferences, notify_admin_actions: checked })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
