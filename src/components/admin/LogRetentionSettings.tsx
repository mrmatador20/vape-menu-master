import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSettingByKey, useUpdateSetting } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, Clock, FileWarning, Loader2, Mail, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const RETENTION_OPTIONS = [
  { value: '30', label: '30 dias', description: 'Mínimo para auditorias básicas' },
  { value: '365', label: '1 ano', description: 'Recomendado para compliance' },
  { value: '1825', label: '5 anos', description: 'Máximo para conformidade legal (LGPD/GDPR)' },
];

export default function LogRetentionSettings() {
  const { data: retentionSetting, isLoading } = useSettingByKey('audit_log_retention_days');
  const updateSetting = useUpdateSetting();
  
  const [selectedRetention, setSelectedRetention] = useState<string>('1825');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmChecks, setConfirmChecks] = useState({
    understand: false,
    irreversible: false,
    notifyAdmins: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [pendingRetention, setPendingRetention] = useState<string>('');

  // Query to get count of logs that would be deleted
  const { data: logsToDelete, refetch: refetchLogsCount } = useQuery({
    queryKey: ['logs-to-delete-count', pendingRetention],
    queryFn: async () => {
      if (!pendingRetention) return 0;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(pendingRetention));
      
      const { count, error } = await supabase
        .from('user_activity_logs')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString());
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!pendingRetention && showConfirmDialog,
  });

  useEffect(() => {
    if (retentionSetting?.value) {
      setSelectedRetention(retentionSetting.value);
    }
  }, [retentionSetting]);

  const handleRetentionChange = (value: string) => {
    // If reducing retention period, show confirmation
    const currentDays = parseInt(selectedRetention);
    const newDays = parseInt(value);
    
    if (newDays < currentDays) {
      setPendingRetention(value);
      setShowConfirmDialog(true);
      setConfirmChecks({ understand: false, irreversible: false, notifyAdmins: true });
    } else {
      // Increasing retention is safe, just update
      saveRetention(value, false);
    }
  };

  const saveRetention = async (value: string, sendNotification: boolean) => {
    setIsSaving(true);
    try {
      // Update the setting
      await updateSetting.mutateAsync({
        key: 'audit_log_retention_days',
        value: value,
        description: 'Período de retenção de logs de auditoria em dias',
      });

      // Send notification if reducing retention
      if (sendNotification && logsToDelete && logsToDelete > 0) {
        const scheduledDate = new Date();
        scheduledDate.setHours(3, 0, 0, 0); // Next 3 AM
        if (scheduledDate <= new Date()) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        await supabase.functions.invoke('notify-log-cleanup', {
          body: {
            retentionDays: parseInt(value),
            logsToDelete: logsToDelete,
            scheduledDate: scheduledDate.toISOString(),
          },
        });

        toast.success('Configuração atualizada e notificações enviadas aos administradores');
      }

      setSelectedRetention(value);
      setShowConfirmDialog(false);
    } catch (error: any) {
      console.error('Error saving retention setting:', error);
      toast.error('Erro ao salvar configuração: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const canConfirm = confirmChecks.understand && confirmChecks.irreversible;

  const getRetentionLabel = (days: string) => {
    return RETENTION_OPTIONS.find(opt => opt.value === days)?.label || `${days} dias`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Retenção de Logs de Auditoria
          </CardTitle>
          <CardDescription>
            Configure por quanto tempo os logs de atividade serão mantidos no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Sobre a Retenção de Logs</AlertTitle>
            <AlertDescription>
              Logs de auditoria são essenciais para segurança e compliance. A LGPD e GDPR 
              recomendam manter registros de atividade por no mínimo 5 anos para fins legais.
              Logs mais antigos que o período configurado serão automaticamente excluídos às 3:00 AM (UTC).
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Período de Retenção</Label>
            <Select value={selectedRetention} onValueChange={handleRetentionChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Atenção</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Reduzir o período de retenção é uma ação <strong>irreversível</strong>. 
              Logs excluídos não podem ser recuperados e isso pode impactar investigações 
              de segurança e requisitos de compliance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <FileWarning className="h-5 w-5" />
              Confirmar Redução do Período de Retenção
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4">
                <Alert variant="destructive">
                  <Trash2 className="h-4 w-4" />
                  <AlertTitle>AÇÃO IRREVERSÍVEL</AlertTitle>
                  <AlertDescription>
                    Você está prestes a reduzir o período de retenção de{' '}
                    <strong>{getRetentionLabel(selectedRetention)}</strong> para{' '}
                    <strong>{getRetentionLabel(pendingRetention)}</strong>.
                  </AlertDescription>
                </Alert>

                {logsToDelete !== undefined && logsToDelete > 0 && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-lg font-semibold text-destructive">
                      {logsToDelete.toLocaleString('pt-BR')} logs serão deletados
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Esta ação será executada automaticamente às 3:00 AM (UTC)
                    </p>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <p className="font-medium">O que será perdido:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Registros de login e logout de usuários</li>
                    <li>Tentativas de autenticação (sucesso e falha)</li>
                    <li>Alterações de senha e configurações MFA</li>
                    <li>Atividades administrativas</li>
                    <li>Acessos a dados sensíveis</li>
                  </ul>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="understand"
                      checked={confirmChecks.understand}
                      onCheckedChange={(checked) => 
                        setConfirmChecks(prev => ({ ...prev, understand: checked as boolean }))
                      }
                    />
                    <Label htmlFor="understand" className="text-sm leading-relaxed cursor-pointer">
                      Entendo que logs antigos serão <strong>permanentemente excluídos</strong> e 
                      isso pode afetar investigações de segurança
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="irreversible"
                      checked={confirmChecks.irreversible}
                      onCheckedChange={(checked) => 
                        setConfirmChecks(prev => ({ ...prev, irreversible: checked as boolean }))
                      }
                    />
                    <Label htmlFor="irreversible" className="text-sm leading-relaxed cursor-pointer">
                      Confirmo que esta ação é <strong>irreversível</strong> e os dados 
                      não poderão ser recuperados
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2 pt-2 border-t">
                    <Checkbox
                      id="notifyAdmins"
                      checked={confirmChecks.notifyAdmins}
                      onCheckedChange={(checked) => 
                        setConfirmChecks(prev => ({ ...prev, notifyAdmins: checked as boolean }))
                      }
                    />
                    <Label htmlFor="notifyAdmins" className="text-sm leading-relaxed cursor-pointer flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Notificar todos os administradores por email
                    </Label>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => saveRetention(pendingRetention, confirmChecks.notifyAdmins)}
              disabled={!canConfirm || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
