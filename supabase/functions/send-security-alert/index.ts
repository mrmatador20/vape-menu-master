import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ==================== CONFIGURAÇÃO ====================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityAlertRequest {
  userId: string;
  userEmail: string;
  alertType: 'suspicious_login' | 'failed_auth' | 'admin_action' | 'password_change' | 'account_locked';
  metadata?: any;
}

interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  phone_number: string | null;
  notify_suspicious_login: boolean;
  notify_failed_auth: boolean;
  notify_admin_actions: boolean;
  notify_password_change: boolean;
  notify_account_locked: boolean;
}

// ==================== HELPER FUNCTIONS ====================

async function sendEmail(userEmail: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY não configurado");
  }

  console.log(`📧 Tentando enviar email para: ${userEmail}`);
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: "Segurança <security@resend.dev>",
      to: [userEmail],
      subject,
      html,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("❌ Erro ao enviar email:", data);
    return { error: data };
  }
  
  console.log("✅ Email enviado com sucesso");
  return { error: null };
}

async function sendSMS(phoneNumber: string, message: string) {
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    throw new Error("Credenciais Twilio não configuradas");
  }

  console.log(`📱 Tentando enviar SMS para: ${phoneNumber}`);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: twilioPhoneNumber,
        Body: message,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("❌ Erro ao enviar SMS:", result);
    return { success: false, error: result };
  }

  console.log("✅ SMS enviado com sucesso");
  return { success: true, error: null };
}

function renderEmail(alertType: string, userEmail: string, metadata: any): string {
  const timestamp = new Date().toLocaleString('pt-BR');

  const templates: Record<string, string> = {
    suspicious_login: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
          <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px;">
            <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 20px;">⚠️ Alerta de Segurança</h1>
            <p style="color: #333; font-size: 16px; line-height: 26px;">
              Detectamos uma tentativa de login suspeita em sua conta de um dispositivo ou localização incomum.
            </p>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>E-mail:</strong> ${userEmail}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>IP:</strong> ${metadata?.ipAddress || 'Desconhecido'}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Localização:</strong> ${metadata?.location || 'Localização desconhecida'}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Data/Hora:</strong> ${timestamp}</p>
            </div>
            <p style="color: #dc2626; font-size: 16px; font-weight: 600;">
              Se não foi você quem tentou fazer login, recomendamos que você altere sua senha imediatamente.
            </p>
          </div>
        </body>
      </html>
    `,
    failed_auth: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
          <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px;">
            <h1 style="color: #d97706; font-size: 24px; margin-bottom: 20px;">🔒 Alerta de Falha de Autenticação</h1>
            <p style="color: #333; font-size: 16px; line-height: 26px;">
              Sua conta sofreu múltiplas tentativas de login falhadas recentemente.
            </p>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>E-mail:</strong> ${userEmail}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Tentativas:</strong> ${metadata?.attemptCount || 0}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>IP:</strong> ${metadata?.ipAddress || 'Desconhecido'}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Última tentativa:</strong> ${timestamp}</p>
            </div>
            <p style="color: #d97706; font-size: 16px; font-weight: 600;">
              Caso não tenha sido você, recomendamos a alteração de sua senha imediatamente.
            </p>
          </div>
        </body>
      </html>
    `,
    admin_action: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
          <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px;">
            <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 20px;">🔐 Notificação de Ação Administrativa</h1>
            <p style="color: #333; font-size: 16px; line-height: 26px;">
              Uma ação administrativa importante foi realizada em sua conta.
            </p>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>E-mail:</strong> ${userEmail}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Ação:</strong> ${metadata?.actionType || 'Ação administrativa'}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Data/Hora:</strong> ${timestamp}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Descrição:</strong> ${metadata?.description || 'Ação realizada em sua conta'}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    password_change: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
          <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px;">
            <h1 style="color: #16a34a; font-size: 24px; margin-bottom: 20px;">✅ Senha Alterada</h1>
            <p style="color: #333; font-size: 16px; line-height: 26px;">
              Atenção! Sua senha foi alterada recentemente.
            </p>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>E-mail:</strong> ${userEmail}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Data/Hora:</strong> ${timestamp}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>IP:</strong> ${metadata?.ipAddress || 'Desconhecido'}</p>
            </div>
            <p style="color: #dc2626; font-size: 16px; font-weight: 600;">
              Caso não tenha sido você, entre em contato imediatamente com a equipe de suporte.
            </p>
          </div>
        </body>
      </html>
    `,
    account_locked: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
          <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px;">
            <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 20px;">🔒 Conta Bloqueada</h1>
            <p style="color: #333; font-size: 16px; line-height: 26px;">
              Para sua segurança, sua conta foi bloqueada temporariamente.
            </p>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>E-mail:</strong> ${userEmail}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Motivo:</strong> ${metadata?.reason || 'Múltiplas tentativas de login falhas'}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Desbloqueio em:</strong> ${metadata?.unlockTime || '15 minutos'}</p>
              <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Bloqueado em:</strong> ${timestamp}</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  return templates[alertType] || templates.suspicious_login;
}

function getEmailSubject(alertType: string): string {
  const subjects: Record<string, string> = {
    suspicious_login: '⚠️ Tentativa de Login Suspeita Detectada',
    failed_auth: '🔒 Múltiplas Falhas de Autenticação',
    admin_action: '🔐 Ação Administrativa Realizada',
    password_change: '✅ Sua Senha Foi Alterada',
    account_locked: '🔒 Sua Conta Foi Bloqueada Temporariamente',
  };
  return subjects[alertType] || 'Alerta de Segurança';
}

function getSMSMessage(alertType: string, metadata: any): string {
  const messages: Record<string, string> = {
    suspicious_login: `ALERTA DE SEGURANÇA: Detectamos uma tentativa de login suspeita em sua conta de ${metadata?.location || 'localização desconhecida'}. Se não foi você, altere sua senha imediatamente.`,
    failed_auth: `ALERTA: Sua conta teve ${metadata?.attemptCount || 'múltiplas'} tentativas de login falhas. Se não foi você, altere sua senha agora.`,
    admin_action: `NOTIFICAÇÃO: Uma ação administrativa foi realizada em sua conta: ${metadata?.actionType || 'ação não especificada'}. Caso não tenha sido você, entre em contato com o suporte.`,
    password_change: `CONFIRMAÇÃO: Sua senha foi alterada. Se não foi você, entre em contato com o suporte IMEDIATAMENTE.`,
    account_locked: `BLOQUEIO: Sua conta foi bloqueada por ${metadata?.unlockTime || '15 minutos'} devido a tentativas de login suspeitas.`,
  };
  return messages[alertType] || 'Alerta de segurança em sua conta.';
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 Iniciando envio de alerta de segurança");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, userEmail, alertType, metadata = {} }: SecurityAlertRequest = await req.json();

    console.log(`📋 Detalhes: userId=${userId}, email=${userEmail}, tipo=${alertType}`);

    // Buscar preferências de notificação
    let { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      console.error("❌ Erro ao buscar preferências:", prefError);
      throw prefError;
    }

    // Criar preferências padrão se não existirem
    if (!preferences) {
      console.log("⚙️ Criando preferências padrão para o usuário");
      const { data: newPrefs, error: insertError } = await supabase
        .from("notification_preferences")
        .insert({
          user_id: userId,
          email_enabled: true,
          sms_enabled: false,
          notify_suspicious_login: true,
          notify_failed_auth: true,
          notify_admin_actions: true,
          notify_password_change: true,
          notify_account_locked: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Erro ao criar preferências:", insertError);
        // Continuar com valores padrão
        preferences = {
          email_enabled: true,
          sms_enabled: false,
          phone_number: null,
          notify_suspicious_login: true,
          notify_failed_auth: true,
          notify_admin_actions: true,
          notify_password_change: true,
          notify_account_locked: true,
        } as any;
      } else {
        preferences = newPrefs;
      }
    }

    console.log("📊 Preferências carregadas:", {
      email_enabled: preferences.email_enabled,
      sms_enabled: preferences.sms_enabled,
      phone_number: preferences.phone_number ? "configurado" : "não configurado"
    });

    // Verificar se o tipo de notificação está ativado
    const notificationMapping: Record<string, boolean> = {
      suspicious_login: preferences.notify_suspicious_login,
      failed_auth: preferences.notify_failed_auth,
      admin_action: preferences.notify_admin_actions,
      password_change: preferences.notify_password_change,
      account_locked: preferences.notify_account_locked,
    };

    if (!notificationMapping[alertType]) {
      console.log("⚠️ Tipo de notificação desativado pelo usuário");
      return new Response(
        JSON.stringify({ message: "Notification disabled by user" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];

    // ==================== ENVIAR EMAIL ====================
    if (preferences.email_enabled) {
      try {
        const emailHtml = renderEmail(alertType, userEmail, metadata);
        const subject = getEmailSubject(alertType);

        const { error: emailError } = await sendEmail(userEmail, subject, emailHtml);

        // Registrar log no banco
        await supabase.from("security_notification_logs").insert({
          user_id: userId,
          notification_type: alertType,
          channel: "email",
          recipient: userEmail,
          subject,
          message_content: emailHtml,
          status: emailError ? "failed" : "sent",
          error_message: emailError ? JSON.stringify(emailError) : null,
          metadata,
        });

        results.push({ 
          channel: "email", 
          success: !emailError, 
          error: emailError 
        });
      } catch (emailError: any) {
        console.error("❌ Exceção no envio de email:", emailError);
        results.push({ 
          channel: "email", 
          success: false, 
          error: emailError.message 
        });
      }
    } else {
      console.log("📧 Email desativado");
    }

    // ==================== ENVIAR SMS ====================
    if (preferences.sms_enabled && preferences.phone_number) {
      try {
        const smsMessage = getSMSMessage(alertType, metadata);
        const { success, error: smsError } = await sendSMS(preferences.phone_number, smsMessage);

        // Registrar log no banco
        await supabase.from("security_notification_logs").insert({
          user_id: userId,
          notification_type: alertType,
          channel: "sms",
          recipient: preferences.phone_number,
          message_content: smsMessage,
          status: success ? "sent" : "failed",
          error_message: smsError ? JSON.stringify(smsError) : null,
          metadata,
        });

        results.push({ 
          channel: "sms", 
          success, 
          error: smsError 
        });
      } catch (smsError: any) {
        console.error("❌ Exceção no envio de SMS:", smsError);
        results.push({ 
          channel: "sms", 
          success: false, 
          error: smsError.message 
        });
      }
    } else {
      if (!preferences.sms_enabled) {
        console.log("📱 SMS desativado");
      } else {
        console.log("📱 SMS ativado mas número de telefone não configurado");
      }
    }

    console.log("✅ Processo concluído. Resultados:", JSON.stringify(results, null, 2));

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Erro crítico na função:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});