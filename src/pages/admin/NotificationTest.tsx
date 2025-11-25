import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { sendSecurityAlert } from "@/lib/sendSecurityAlert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, TestTube } from "lucide-react";

const NotificationTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [alertType, setAlertType] = useState<"suspicious_login" | "failed_auth" | "admin_action" | "password_change">("suspicious_login");
  const [testEmail, setTestEmail] = useState("");
  const [testUserId, setTestUserId] = useState("");
  const [testUserName, setTestUserName] = useState("");
  const [testPhone, setTestPhone] = useState("");

  const handleSendTest = async () => {
    if (!testEmail || !testUserId || !testUserName || !testPhone) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos antes de enviar o teste.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // First, create/update notification preferences with phone and SMS enabled
      const { error: prefsError } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: testUserId,
          phone_number: testPhone,
          sms_enabled: true,
          email_enabled: true,
          notify_suspicious_login: true,
          notify_failed_login: true,
          notify_password_change: true,
          notify_admin_actions: true,
        });

      if (prefsError) {
        throw new Error(`Erro ao configurar preferências: ${prefsError.message}`);
      }
      const eventDetails: any = {
        timestamp: new Date().toLocaleString("pt-BR"),
        ipAddress: "192.168.1.1",
        deviceInfo: "Chrome 120.0 / Windows 10",
      };

      switch (alertType) {
        case "suspicious_login":
          eventDetails.location = "São Paulo, Brasil";
          break;
        case "failed_auth":
          eventDetails.attemptCount = 5;
          break;
        case "admin_action":
          eventDetails.actionType = "Alteração de Permissões";
          eventDetails.actionDescription = "Permissões de administrador foram modificadas";
          break;
        case "password_change":
          // Já tem os campos básicos
          break;
      }

      await sendSecurityAlert({
        userId: testUserId,
        email: testEmail,
        userName: testUserName,
        alertType,
        eventDetails,
      });

      toast({
        title: "Notificação enviada!",
        description: `Alerta de teste do tipo "${alertType}" foi enviado para ${testEmail}`,
      });
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      toast({
        title: "Erro ao enviar notificação",
        description: error.message || "Ocorreu um erro ao tentar enviar a notificação de teste.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TestTube className="h-8 w-8" />
          Teste de Notificações de Segurança
        </h1>
        <p className="text-muted-foreground mt-2">
          Use esta página para testar o sistema de notificações por e-mail e SMS
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Teste</CardTitle>
            <CardDescription>
              Preencha os dados para enviar uma notificação de teste
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="UUID do usuário (ex: 123e4567-e89b-12d3-a456-426614174000)"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName">Nome do Usuário</Label>
              <Input
                id="userName"
                placeholder="João Silva"
                value={testUserName}
                onChange={(e) => setTestUserName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail de Teste</Label>
              <Input
                id="email"
                type="email"
                placeholder="teste@exemplo.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (com DDD)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+5511999999999"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Formato: +55 seguido do DDD e número (ex: +5511999999999)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertType">Tipo de Alerta</Label>
              <Select value={alertType} onValueChange={(value: any) => setAlertType(value)}>
                <SelectTrigger id="alertType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suspicious_login">
                    ⚠️ Login Suspeito
                  </SelectItem>
                  <SelectItem value="failed_auth">
                    🔒 Falhas de Autenticação
                  </SelectItem>
                  <SelectItem value="admin_action">
                    🔐 Ação Administrativa
                  </SelectItem>
                  <SelectItem value="password_change">
                    🔑 Alteração de Senha
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSendTest}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Notificação de Teste
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações sobre o Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • A notificação será enviada para o e-mail e telefone especificados
            </p>
            <p>
              • O sistema habilitará automaticamente SMS para este teste
            </p>
            <p>
              • Verifique os logs da Edge Function "send-security-alert" para debug
            </p>
            <p>
              • Os logs de notificação ficam salvos na tabela "security_notification_logs"
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationTest;
