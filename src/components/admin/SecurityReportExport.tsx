import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Loader2, CheckCircle } from 'lucide-react';
import { generateSecurityReport } from '@/lib/generateSecurityReport';
import { useSecurityMetrics } from '@/hooks/useSecurityMetrics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logActivity } from '@/hooks/useActivityLogs';

const SecurityReportExport = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const { data: metrics, isLoading } = useSecurityMetrics();

  const handleExportPDF = async () => {
    if (!metrics) {
      toast({
        title: 'Erro',
        description: 'Métricas de segurança não disponíveis. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const generatedBy = user?.email || 'Administrador';

      generateSecurityReport({
        metrics,
        generatedBy,
        companyName: 'NebulaVape',
      });

      setLastGenerated(new Date());

      // Log the export action
      if (user) {
        await logActivity('sensitive_data_accessed' as any, {
          metadata: {
            action: 'security_report_exported',
            securityScore: metrics.securityScore,
            anomaliesCount: metrics.anomalies.length,
            blockedIPsCount: metrics.blockedIPs.length,
          },
          severity: 'info',
        });
      }

      toast({
        title: 'Relatório Gerado',
        description: 'O relatório de auditoria de segurança foi baixado com sucesso.',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Erro ao Gerar Relatório',
        description: 'Ocorreu um erro ao gerar o relatório. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Exportar Relatório de Auditoria
        </CardTitle>
        <CardDescription>
          Gere um relatório PDF completo para documentação de compliance (LGPD/GDPR)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">O relatório inclui:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Índice de segurança geral e status</li>
            <li>• Métricas de tentativas de login (24h)</li>
            <li>• Anomalias e padrões suspeitos detectados</li>
            <li>• IPs bloqueados por rate limiting</li>
            <li>• Ações críticas recentes (7 dias)</li>
            <li>• Status de conformidade LGPD/GDPR</li>
            <li>• Proteções implementadas</li>
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {lastGenerated && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Último relatório: {lastGenerated.toLocaleString('pt-BR')}
              </span>
            )}
          </div>
          <Button 
            onClick={handleExportPDF} 
            disabled={isGenerating || isLoading}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exportar PDF
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Recomendação: Gere e arquive relatórios mensalmente para fins de auditoria e compliance.
          O relatório é gerado com base nos dados atuais do sistema.
        </p>
      </CardContent>
    </Card>
  );
};

export default SecurityReportExport;
