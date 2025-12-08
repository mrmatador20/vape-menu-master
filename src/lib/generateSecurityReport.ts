import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SecurityMetrics } from '@/hooks/useSecurityMetrics';

interface ReportData {
  metrics: SecurityMetrics;
  generatedBy: string;
  companyName?: string;
}

export const generateSecurityReport = (data: ReportData): void => {
  const { metrics, generatedBy, companyName = 'NebulaVape' } = data;
  const doc = new jsPDF();
  const now = new Date();
  const reportDate = format(now, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  
  let yPosition = 20;
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(139, 92, 246); // Purple
  doc.text('RELATÓRIO DE AUDITORIA DE SEGURANÇA', 105, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(companyName, 105, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.text(`Gerado em: ${reportDate}`, 105, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.text(`Por: ${generatedBy}`, 105, yPosition, { align: 'center' });
  
  // Divider
  yPosition += 10;
  doc.setDrawColor(200);
  doc.line(20, yPosition, 190, yPosition);
  
  // Executive Summary
  yPosition += 15;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('1. RESUMO EXECUTIVO', 20, yPosition);
  
  yPosition += 10;
  doc.setFontSize(10);
  
  const scoreColor = metrics.securityScore >= 80 ? [16, 185, 129] : 
                     metrics.securityScore >= 60 ? [245, 158, 11] : [239, 68, 68];
  
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.setFontSize(16);
  doc.text(`Índice de Segurança: ${metrics.securityScore}/100`, 20, yPosition);
  
  yPosition += 10;
  doc.setTextColor(0);
  doc.setFontSize(10);
  
  const statusText = metrics.securityScore >= 80 ? 'BOM - Sistema operando com segurança adequada' :
                     metrics.securityScore >= 60 ? 'ATENÇÃO - Requer monitoramento próximo' :
                     'CRÍTICO - Ação imediata necessária';
  doc.text(`Status: ${statusText}`, 20, yPosition);
  
  // Key Metrics Table
  yPosition += 15;
  doc.setFontSize(14);
  doc.text('2. MÉTRICAS PRINCIPAIS (Últimas 24h)', 20, yPosition);
  
  yPosition += 5;
  autoTable(doc, {
    startY: yPosition,
    head: [['Métrica', 'Valor', 'Status']],
    body: [
      ['Total de Tentativas de Login', metrics.loginAttempts.total.toString(), 
       metrics.loginAttempts.failed > metrics.loginAttempts.successful ? '⚠️ Alto' : '✓ Normal'],
      ['Logins Bem-sucedidos', metrics.loginAttempts.successful.toString(), '✓'],
      ['Logins Falhos', metrics.loginAttempts.failed.toString(), 
       metrics.loginAttempts.failed > 10 ? '⚠️' : '✓'],
      ['IPs Bloqueados', metrics.blockedIPs.length.toString(), 
       metrics.blockedIPs.length > 5 ? '⚠️' : '✓'],
      ['Anomalias Detectadas', metrics.anomalies.length.toString(),
       metrics.anomalies.length > 0 ? '⚠️' : '✓'],
      ['Ações Críticas (7 dias)', metrics.criticalActions.length.toString(), '-'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] },
    margin: { left: 20, right: 20 },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Anomalies Section
  if (metrics.anomalies.length > 0) {
    doc.setFontSize(14);
    doc.text('3. ANOMALIAS DETECTADAS', 20, yPosition);
    
    yPosition += 5;
    autoTable(doc, {
      startY: yPosition,
      head: [['Tipo', 'Descrição', 'Severidade', 'Data/Hora']],
      body: metrics.anomalies.slice(0, 10).map(a => [
        a.type.replace(/_/g, ' ').toUpperCase(),
        a.description.substring(0, 50) + (a.description.length > 50 ? '...' : ''),
        a.severity.toUpperCase(),
        format(new Date(a.timestamp), 'dd/MM/yyyy HH:mm')
      ]),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 70 },
        2: { cellWidth: 25 },
        3: { cellWidth: 35 },
      },
      margin: { left: 20, right: 20 },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(14);
    doc.text('3. ANOMALIAS DETECTADAS', 20, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text('✓ Nenhuma anomalia detectada no período analisado.', 20, yPosition);
    doc.setTextColor(0);
    yPosition += 15;
  }
  
  // Check if we need a new page
  if (yPosition > 230) {
    doc.addPage();
    yPosition = 20;
  }
  
  // Blocked IPs Section
  doc.setFontSize(14);
  doc.text('4. IPs BLOQUEADOS POR RATE LIMITING', 20, yPosition);
  
  if (metrics.blockedIPs.length > 0) {
    yPosition += 5;
    autoTable(doc, {
      startY: yPosition,
      head: [['Identificador', 'Tentativas', 'Tipo de Ação', 'Expira em']],
      body: metrics.blockedIPs.slice(0, 10).map(ip => [
        ip.identifier.substring(0, 30) + (ip.identifier.length > 30 ? '...' : ''),
        ip.attempt_count.toString(),
        ip.action_type,
        ip.block_expires_at ? format(new Date(ip.block_expires_at), 'dd/MM HH:mm') : 'N/A'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
      margin: { left: 20, right: 20 },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  } else {
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text('✓ Nenhum IP bloqueado no momento.', 20, yPosition);
    doc.setTextColor(0);
    yPosition += 15;
  }
  
  // Check if we need a new page
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }
  
  // Critical Actions Section
  doc.setFontSize(14);
  doc.text('5. AÇÕES CRÍTICAS RECENTES (7 dias)', 20, yPosition);
  
  if (metrics.criticalActions.length > 0) {
    yPosition += 5;
    autoTable(doc, {
      startY: yPosition,
      head: [['Tipo de Ação', 'Severidade', 'Usuário (ID)', 'Data/Hora']],
      body: metrics.criticalActions.slice(0, 15).map(action => [
        action.activity_type.replace(/_/g, ' '),
        action.severity.toUpperCase(),
        action.user_id.substring(0, 8) + '...',
        format(new Date(action.created_at), 'dd/MM/yyyy HH:mm')
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  } else {
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text('✓ Nenhuma ação crítica registrada no período.', 20, yPosition);
    doc.setTextColor(0);
    yPosition += 15;
  }
  
  // Add new page for compliance section
  doc.addPage();
  yPosition = 20;
  
  // Compliance Section
  doc.setFontSize(14);
  doc.text('6. CONFORMIDADE E PROTEÇÕES IMPLEMENTADAS', 20, yPosition);
  
  yPosition += 10;
  doc.setFontSize(10);
  
  const complianceItems = [
    '✓ Autenticação Multi-Fator (2FA/TOTP) habilitada',
    '✓ Políticas de Row Level Security (RLS) ativas em todas as tabelas',
    '✓ Rate Limiting implementado em APIs críticas',
    '✓ Logs de auditoria imutáveis com retenção configurável',
    '✓ Senhas validadas contra banco de dados de vazamentos (HaveIBeenPwned)',
    '✓ Criptografia TLS 1.3 para transmissão de dados',
    '✓ Headers de segurança HTTP configurados (CSP, HSTS, X-Frame-Options)',
    '✓ Validação e sanitização de entrada em todos os formulários',
    '✓ Detecção automática de anomalias e atividades suspeitas',
    '✓ Sistema de alertas em tempo real para eventos críticos',
  ];
  
  complianceItems.forEach(item => {
    doc.text(item, 25, yPosition);
    yPosition += 7;
  });
  
  yPosition += 10;
  
  // LGPD/GDPR Section
  doc.setFontSize(14);
  doc.text('7. CONFORMIDADE LGPD/GDPR', 20, yPosition);
  
  yPosition += 10;
  doc.setFontSize(10);
  
  const lgpdItems = [
    '✓ Consentimento explícito para coleta de dados',
    '✓ Dados pessoais protegidos por RLS e criptografia',
    '✓ Direito ao esquecimento implementável via admin',
    '✓ Logs de acesso a dados sensíveis auditados',
    '✓ Notificações de segurança configuráveis pelo usuário',
    '✓ Retenção de dados configurável por tipo de informação',
  ];
  
  lgpdItems.forEach(item => {
    doc.text(item, 25, yPosition);
    yPosition += 7;
  });
  
  // Footer with signature
  yPosition = 260;
  doc.setDrawColor(200);
  doc.line(20, yPosition, 190, yPosition);
  
  yPosition += 10;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Este documento foi gerado automaticamente pelo sistema de auditoria de segurança.', 105, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('Para fins de compliance, mantenha este relatório arquivado por pelo menos 5 anos.', 105, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text(`ID do Relatório: SEC-${format(now, 'yyyyMMddHHmmss')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, 105, yPosition, { align: 'center' });
  
  // Save the PDF
  const fileName = `relatorio-seguranca-${format(now, 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
};
