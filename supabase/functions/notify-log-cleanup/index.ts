import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyLogCleanupRequest {
  retentionDays: number;
  logsToDelete: number;
  scheduledDate: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentication: admin only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { retentionDays, logsToDelete, scheduledDate }: NotifyLogCleanupRequest = await req.json();

    console.log(`[notify-log-cleanup] Processing notification for ${logsToDelete} logs, retention: ${retentionDays} days`);

    // Get all admin users to notify
    const { data: adminUsers, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('[notify-log-cleanup] Error fetching admins:', adminError);
      throw adminError;
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('[notify-log-cleanup] No admin users found');
      return new Response(JSON.stringify({ success: true, message: 'No admins to notify' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin emails from auth
    const adminEmails: string[] = [];
    for (const admin of adminUsers) {
      const { data: userData } = await supabase.auth.admin.getUserById(admin.user_id);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log('[notify-log-cleanup] No admin emails found');
      return new Response(JSON.stringify({ success: true, message: 'No admin emails found' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate retention period description
    let retentionDescription = '';
    if (retentionDays <= 30) {
      retentionDescription = '30 dias';
    } else if (retentionDays <= 365) {
      retentionDescription = '1 ano';
    } else {
      retentionDescription = '5 anos';
    }

    // Send notification email to all admins
    const emailResponse = await resend.emails.send({
      from: "Sistema <onboarding@resend.dev>",
      to: adminEmails,
      subject: "⚠️ Aviso: Limpeza de Logs de Auditoria Agendada",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 20px; border: 1px solid #e5e7eb; }
            .warning-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .danger-box { background: #fee2e2; border: 1px solid #dc2626; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
            .btn { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Limpeza de Logs Agendada</h1>
            </div>
            <div class="content">
              <p>Olá Administrador,</p>
              
              <p>Este é um aviso automático sobre a limpeza programada de logs de auditoria do sistema.</p>
              
              <div class="warning-box">
                <strong>📋 Resumo da Operação:</strong>
                <div class="info-row">
                  <span>Logs a serem deletados:</span>
                  <strong>${logsToDelete.toLocaleString('pt-BR')} registros</strong>
                </div>
                <div class="info-row">
                  <span>Período de retenção:</span>
                  <strong>${retentionDescription}</strong>
                </div>
                <div class="info-row">
                  <span>Data agendada:</span>
                  <strong>${new Date(scheduledDate).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</strong>
                </div>
              </div>
              
              <div class="danger-box">
                <strong>🚨 ATENÇÃO - AÇÃO IRREVERSÍVEL:</strong>
                <ul>
                  <li><strong>Esta operação NÃO pode ser revertida</strong></li>
                  <li>Todos os logs mais antigos que ${retentionDescription} serão permanentemente excluídos</li>
                  <li>Dados de auditoria, tentativas de login e atividades de usuários serão perdidos</li>
                  <li>Isso pode afetar investigações de segurança e compliance</li>
                </ul>
              </div>
              
              <p>Se você deseja <strong>alterar o período de retenção</strong> ou <strong>cancelar esta operação</strong>, acesse as configurações do sistema antes da data agendada.</p>
              
              <p><strong>O que será deletado:</strong></p>
              <ul>
                <li>Logs de login e logout</li>
                <li>Tentativas de autenticação falhas</li>
                <li>Alterações de senha e configurações de segurança</li>
                <li>Atividades administrativas</li>
                <li>Registros de acesso a dados sensíveis</li>
              </ul>
              
            </div>
            <div class="footer">
              <p>Este é um email automático do sistema de segurança.</p>
              <p>© ${new Date().getFullYear()} Sistema de Auditoria</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('[notify-log-cleanup] Email sent successfully');

    // Log this notification in activity logs
    for (const admin of adminUsers) {
      await supabase.from('user_activity_logs').insert({
        user_id: admin.user_id,
        activity_type: 'admin_settings_changed',
        metadata: {
          action: 'log_cleanup_notification_sent',
          retention_days: retentionDays,
          logs_to_delete: logsToDelete,
          scheduled_date: scheduledDate,
        },
        severity: 'warning',
      });
    }

    return new Response(
      JSON.stringify({ success: true, notifiedAdmins: adminEmails.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[notify-log-cleanup] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
