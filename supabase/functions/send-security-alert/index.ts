import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityAlertRequest {
  alertType: 'failed_2fa' | 'account_blocked' | 'new_device' | 'suspicious_login';
  email: string;
  userName?: string;
  details: {
    attempts?: number;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    timestamp: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { alertType, email, userName, details }: SecurityAlertRequest = await req.json();
    
    // Get client IP address from request headers
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'Unknown';

    console.log('Sending security alert:', { alertType, email, userName, details, clientIp });

    // Log the security event to user_activity_logs
    await supabaseClient.from('user_activity_logs').insert({
      user_id: user.id,
      activity_type: alertType === 'failed_2fa' ? 'login_failed' : 'login',
      ip_address: clientIp,
      user_agent: details.userAgent,
      metadata: {
        alert_type: alertType,
        attempts: details.attempts,
        timestamp: details.timestamp,
      },
    });

    let subject = '';
    let html = '';
    const displayName = userName || email.split('@')[0];

    switch (alertType) {
      case 'failed_2fa':
        subject = '🔒 Alerta de Segurança: Tentativas Falhas de 2FA';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⚠️ Tentativas Falhas de Autenticação 2FA</h2>
            <p>Olá ${displayName},</p>
            <p>Detectamos <strong>${details.attempts || 1} tentativa(s) falha(s)</strong> de autenticação de 2 fatores em sua conta.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #dc2626;">Detalhes do Acesso:</h3>
              <ul style="margin: 10px 0;">
                <li><strong>Endereço IP:</strong> ${clientIp}</li>
                <li><strong>Navegador/Dispositivo:</strong> ${details.userAgent || 'Desconhecido'}</li>
                <li><strong>Data e Hora:</strong> ${new Date(details.timestamp).toLocaleString('pt-BR')}</li>
              </ul>
            </div>

            <p><strong>O que fazer?</strong></p>
            <ul>
              <li>Se foi você, ignore este e-mail.</li>
              <li>Se não foi você, altere sua senha imediatamente e verifique suas configurações de 2FA.</li>
              <li>Entre em contato com o suporte se precisar de ajuda.</li>
            </ul>

            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              Este é um e-mail automático de segurança. Para sua proteção, não responda a este e-mail.
            </p>
          </div>
        `;
        break;

      case 'account_blocked':
        subject = '🔒 Alerta de Segurança: Conta Temporariamente Bloqueada';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">🚫 Conta Bloqueada por Segurança</h2>
            <p>Olá ${displayName},</p>
            <p>Sua conta foi <strong>temporariamente bloqueada por 15 minutos</strong> devido a múltiplas tentativas falhas de autenticação 2FA.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #dc2626;">Detalhes do Bloqueio:</h3>
              <ul style="margin: 10px 0;">
                <li><strong>Tentativas Falhas:</strong> ${details.attempts || 5}</li>
                <li><strong>Endereço IP:</strong> ${clientIp}</li>
                <li><strong>Navegador/Dispositivo:</strong> ${details.userAgent || 'Desconhecido'}</li>
                <li><strong>Data e Hora:</strong> ${new Date(details.timestamp).toLocaleString('pt-BR')}</li>
              </ul>
            </div>

            <p><strong>O que fazer?</strong></p>
            <ul>
              <li>Aguarde 15 minutos antes de tentar novamente.</li>
              <li>Verifique se está usando o código correto do seu aplicativo autenticador.</li>
              <li>Se não foi você tentando acessar, altere sua senha imediatamente após o desbloqueio.</li>
              <li>Entre em contato com o suporte se precisar de ajuda urgente.</li>
            </ul>

            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              Este é um e-mail automático de segurança. Para sua proteção, não responda a este e-mail.
            </p>
          </div>
        `;
        break;

      case 'new_device':
        subject = '🔔 Novo Dispositivo Detectado';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🔔 Login de Novo Dispositivo</h2>
            <p>Olá ${displayName},</p>
            <p>Detectamos um login em sua conta de um <strong>dispositivo não reconhecido</strong>.</p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2563eb;">Detalhes do Login:</h3>
              <ul style="margin: 10px 0;">
                <li><strong>Endereço IP:</strong> ${clientIp}</li>
                <li><strong>Navegador/Dispositivo:</strong> ${details.userAgent || 'Desconhecido'}</li>
                <li><strong>Data e Hora:</strong> ${new Date(details.timestamp).toLocaleString('pt-BR')}</li>
              </ul>
            </div>

            <p><strong>Foi você?</strong></p>
            <ul>
              <li>Se foi você, ignore este e-mail.</li>
              <li>Se não foi você, <strong>altere sua senha imediatamente</strong> e revise sua atividade recente.</li>
            </ul>

            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              Este é um e-mail automático de segurança. Para sua proteção, não responda a este e-mail.
            </p>
          </div>
        `;
        break;

      case 'suspicious_login':
        subject = '⚠️ Alerta de Segurança: Atividade Suspeita Detectada';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ea580c;">⚠️ Atividade Suspeita Detectada</h2>
            <p>Olá ${displayName},</p>
            <p>Detectamos uma <strong>atividade suspeita</strong> em sua conta.</p>
            
            <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #ea580c;">Detalhes da Atividade:</h3>
              <ul style="margin: 10px 0;">
                <li><strong>Endereço IP:</strong> ${clientIp}</li>
                <li><strong>Localização:</strong> ${details.location || 'Desconhecida'}</li>
                <li><strong>Navegador/Dispositivo:</strong> ${details.userAgent || 'Desconhecido'}</li>
                <li><strong>Data e Hora:</strong> ${new Date(details.timestamp).toLocaleString('pt-BR')}</li>
              </ul>
            </div>

            <p><strong>Ação Recomendada:</strong></p>
            <ul>
              <li>Revise sua atividade recente na conta.</li>
              <li>Altere sua senha se não reconhecer esta atividade.</li>
              <li>Ative a autenticação de 2 fatores se ainda não tiver.</li>
              <li>Entre em contato com o suporte para investigação adicional.</li>
            </ul>

            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              Este é um e-mail automático de segurança. Para sua proteção, não responda a este e-mail.
            </p>
          </div>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "Segurança NebulaVape <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    console.log("Security alert email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Security alert sent',
        emailResponse 
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-security-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
