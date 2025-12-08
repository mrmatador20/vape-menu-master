import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bell, Shield, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';

const AnomalyAlertSettings = () => {
  const { data: settings, isLoading } = useSettings();
  const updateSettingMutation = useUpdateSetting();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const alertEnabled = settings?.find(s => s.key === 'security_anomaly_alerts_enabled')?.value === 'true';
  const bruteForceThreshold = settings?.find(s => s.key === 'brute_force_threshold')?.value || '5';
  const mfaFailureThreshold = settings?.find(s => s.key === 'mfa_failure_threshold')?.value || '3';

  const handleToggleAlerts = async () => {
    const newValue = alertEnabled ? 'false' : 'true';
    await updateSettingMutation.mutateAsync({ 
      key: 'security_anomaly_alerts_enabled', 
      value: newValue, 
      description: 'Habilita/desabilita alertas automáticos de anomalias' 
    });
    toast({
      title: alertEnabled ? 'Alertas Desabilitados' : 'Alertas Habilitados',
      description: alertEnabled 
        ? 'Os alertas automáticos de segurança foram desabilitados.' 
        : 'Os alertas automáticos de segurança foram habilitados.',
    });
  };

  const handleUpdateThreshold = async (key: string, value: string, description: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 1) {
      toast({
        title: 'Valor Inválido',
        description: 'O valor deve ser um número maior que 0.',
        variant: 'destructive',
      });
      return;
    }
    await updateSettingMutation.mutateAsync({ key, value, description });
    toast({
      title: 'Configuração Atualizada',
      description: 'O limite foi atualizado com sucesso.',
    });
  };

  const handleTestAlerts = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('security-anomaly-alerts');

      if (error) throw error;

      setTestResult('success');
      toast({
        title: 'Teste Executado',
        description: `Detecção concluída. ${data.alertsDetected} anomalias encontradas, ${data.criticalAlerts} críticas.`,
      });
    } catch (error) {
      console.error('Error testing alerts:', error);
      setTestResult('error');
      toast({
        title: 'Erro no Teste',
        description: 'Falha ao executar detecção de anomalias.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertas Automáticos de Anomalias
        </CardTitle>
        <CardDescription>
          Configure a detecção automática e notificações de atividades suspeitas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Alertas de Segurança</Label>
            <p className="text-sm text-muted-foreground">
              Receba notificações por email quando anomalias forem detectadas
            </p>
          </div>
          <Switch checked={alertEnabled} onCheckedChange={handleToggleAlerts} />
        </div>

        {/* Thresholds Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Limites de Detecção
          </h4>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bruteForce">Tentativas de Brute Force (por IP)</Label>
              <div className="flex gap-2">
                <Input
                  id="bruteForce"
                  type="number"
                  min="1"
                  defaultValue={bruteForceThreshold}
                  className="w-24"
                  onBlur={(e) => handleUpdateThreshold(
                    'brute_force_threshold', 
                    e.target.value,
                    'Número de tentativas falhas de login por IP para detectar brute force'
                  )}
                />
                <span className="text-sm text-muted-foreground self-center">tentativas em 24h</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Alerta quando um IP falhar este número de logins
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfaFailure">Falhas de 2FA (por usuário)</Label>
              <div className="flex gap-2">
                <Input
                  id="mfaFailure"
                  type="number"
                  min="1"
                  defaultValue={mfaFailureThreshold}
                  className="w-24"
                  onBlur={(e) => handleUpdateThreshold(
                    'mfa_failure_threshold',
                    e.target.value,
                    'Número de falhas de verificação 2FA por usuário para alerta'
                  )}
                />
                <span className="text-sm text-muted-foreground self-center">falhas em 24h</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Alerta quando um usuário falhar verificação 2FA
              </p>
            </div>
          </div>
        </div>

        {/* Detection Types Info */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">Tipos de Anomalias Detectadas:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Brute Force:</strong> Múltiplas tentativas de login falhas do mesmo IP</li>
            <li>• <strong>Credential Stuffing:</strong> Logins rápidos e sucessivos</li>
            <li>• <strong>Bypass de 2FA:</strong> Tentativas repetidas de falha no 2FA</li>
            <li>• <strong>Acesso Incomum:</strong> Logins em horários suspeitos (2h-5h)</li>
            <li>• <strong>DDoS:</strong> Alto número de IPs bloqueados simultaneamente</li>
            <li>• <strong>Account Takeover:</strong> Login bem-sucedido de novo IP após falhas</li>
          </ul>
        </div>

        {/* Test Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {testResult === 'success' && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                Teste executado com sucesso
              </span>
            )}
            {testResult === 'error' && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Falha no teste
              </span>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={handleTestAlerts}
            disabled={isTesting}
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              'Testar Detecção Agora'
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 A detecção de anomalias é executada automaticamente a cada hora via job agendado.
          Os alertas são enviados por email para todos os administradores quando anomalias críticas são detectadas.
        </p>
      </CardContent>
    </Card>
  );
};

export default AnomalyAlertSettings;
