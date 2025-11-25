import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Mail, Smartphone, Shield, ShieldAlert } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const NotificationSettings = () => {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();
  const { data: role, isLoading: isLoadingRole } = useUserRole();
  const navigate = useNavigate();

  // Redirecionar se não for admin
  useEffect(() => {
    if (!isLoadingRole && role !== 'admin') {
      navigate('/');
    }
  }, [role, isLoadingRole, navigate]);

  // Mostrar loading enquanto verifica role
  if (isLoadingRole || isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Skeleton className="h-12 w-64 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificação adicional de segurança
  if (role !== 'admin') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta página. Esta área é restrita a administradores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Alert className="mb-6 border-primary/50 bg-primary/5">
        <Shield className="h-4 w-4 text-primary" />
        <AlertTitle>Área Administrativa - Acesso Restrito</AlertTitle>
        <AlertDescription>
          Apenas administradores podem configurar preferências de notificações de segurança do sistema.
        </AlertDescription>
      </Alert>

      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Configurações de Notificações de Segurança
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie como e quando os administradores desejam receber notificações de segurança do sistema
        </p>
      </div>

      <div className="space-y-6">
        {/* Email e SMS Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Canais de Notificação
            </CardTitle>
            <CardDescription>
              Configure os métodos de notificação que você deseja usar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-enabled" className="text-base">
                  Notificações por E-mail
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas de segurança no seu e-mail
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={preferences?.email_enabled ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ email_enabled: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-enabled" className="text-base flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Notificações por SMS
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receba alertas de segurança no seu celular via SMS
                  </p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={preferences?.sms_enabled ?? false}
                  onCheckedChange={(checked) =>
                    updatePreferences({ sms_enabled: checked })
                  }
                  disabled={isUpdating}
                />
              </div>

              {preferences?.sms_enabled && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="phone-number">Número de Telefone</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone-number"
                      type="tel"
                      placeholder="(83) 99669-4806"
                      value={preferences?.phone_number ? preferences.phone_number.replace('+55', '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3') : ""}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "");
                        const formatted = cleaned
                          .replace(/^(\d{2})(\d)/g, "($1) $2")
                          .replace(/(\d)(\d{4})$/, "$1-$2");
                        updatePreferences({ phone_number: cleaned });
                      }}
                      disabled={isUpdating}
                      maxLength={15}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digite apenas os números (DDD + número). Ex: 83996694806
                  </p>
                  <p className="text-xs text-muted-foreground">
                    O código do país (+55) será adicionado automaticamente
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Alert Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Tipos de Alertas de Segurança
            </CardTitle>
            <CardDescription>
              Escolha quais eventos de segurança devem gerar notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-suspicious-login" className="text-base">
                  Login Suspeito
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notificar sobre tentativas de login de dispositivos ou locais desconhecidos
                </p>
              </div>
              <Switch
                id="notify-suspicious-login"
                checked={preferences?.notify_suspicious_login ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ notify_suspicious_login: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-failed-auth" className="text-base">
                  Falhas de Autenticação
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notificar sobre múltiplas tentativas de login falhas
                </p>
              </div>
              <Switch
                id="notify-failed-auth"
                checked={preferences?.notify_failed_auth ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ notify_failed_auth: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-password-change" className="text-base">
                  Alteração de Senha
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando sua senha for alterada
                </p>
              </div>
              <Switch
                id="notify-password-change"
                checked={preferences?.notify_password_change ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ notify_password_change: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-admin-actions" className="text-base">
                  Ações Administrativas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notificar sobre ações administrativas em sua conta
                </p>
              </div>
              <Switch
                id="notify-admin-actions"
                checked={preferences?.notify_admin_actions ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ notify_admin_actions: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-account-locked" className="text-base">
                  Bloqueio de Conta
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando sua conta for bloqueada por motivos de segurança
                </p>
              </div>
              <Switch
                id="notify-account-locked"
                checked={preferences?.notify_account_locked ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ notify_account_locked: checked })
                }
                disabled={isUpdating}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium">Recomendação de Segurança</p>
                <p className="text-sm text-muted-foreground">
                  Para máxima segurança, recomendamos manter todas as notificações ativadas.
                  Isso ajuda a detectar e responder rapidamente a qualquer atividade suspeita
                  em sua conta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSettings;
