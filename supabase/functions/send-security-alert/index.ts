import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = {
  emails: {
    send: async (options: any) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      const data = await response.json();
      return { error: response.ok ? null : data };
    },
  },
};

const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") as string;
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") as string;
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER") as string;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SecurityAlertRequest {
  userId: string;
  userEmail: string;
  alertType: 'suspicious_login' | 'failed_auth' | 'admin_action' | 'password_change' | 'account_locked';
  metadata: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, userEmail, alertType, metadata }: SecurityAlertRequest = await req.json();

    console.log("Sending security alert:", { userId, userEmail, alertType });

    // Fetch user notification preferences
    let { data: preferences } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Create default preferences if none exist
    if (!preferences) {
      console.log("Creating default notification preferences for user");
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
        console.error("Error creating preferences:", insertError);
        // Continue with default values
        preferences = {
          email_enabled: true,
          sms_enabled: false,
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

    // Check if user has opted in for this type of notification
    const notificationMapping = {
      suspicious_login: preferences?.notify_suspicious_login,
      failed_auth: preferences?.notify_failed_auth,
      admin_action: preferences?.notify_admin_actions,
      password_change: preferences?.notify_password_change,
      account_locked: preferences?.notify_account_locked,
    };

    if (!notificationMapping[alertType]) {
      console.log("User has disabled this notification type");
      return new Response(
        JSON.stringify({ message: "Notification disabled by user" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];

    // Send Email
    if (preferences?.email_enabled !== false) {
      try {
        const emailHtml = await renderEmail(alertType, userEmail, metadata);
        const subject = getEmailSubject(alertType);

        const { error: emailError } = await resend.emails.send({
          from: "Segurança <security@resend.dev>",
          to: [userEmail],
          subject,
          html: emailHtml,
        });

        // Log email notification
        await supabase.from("security_notification_logs").insert({
          user_id: userId,
          notification_type: alertType,
          channel: "email",
          recipient: userEmail,
          subject,
          message_content: emailHtml,
          status: emailError ? "failed" : "sent",
          error_message: emailError?.message,
          metadata,
        });

        results.push({ channel: "email", success: !emailError, error: emailError });
      } catch (emailError: any) {
        console.error("Email error:", emailError);
        results.push({ channel: "email", success: false, error: emailError.message });
      }
    }

    // Send SMS
    if (preferences?.sms_enabled && preferences?.phone_number) {
      try {
        const smsMessage = getSMSMessage(alertType, metadata);
        
        const smsResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: preferences.phone_number,
              From: twilioPhoneNumber,
              Body: smsMessage,
            }),
          }
        );

        const smsResult = await smsResponse.json();

        // Log SMS notification
        await supabase.from("security_notification_logs").insert({
          user_id: userId,
          notification_type: alertType,
          channel: "sms",
          recipient: preferences.phone_number,
          message_content: smsMessage,
          status: smsResponse.ok ? "sent" : "failed",
          error_message: smsResult.message,
          metadata,
        });

        results.push({ 
          channel: "sms", 
          success: smsResponse.ok, 
          error: smsResponse.ok ? null : smsResult.message 
        });
      } catch (smsError: any) {
        console.error("SMS error:", smsError);
        results.push({ channel: "sms", success: false, error: smsError.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-security-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function renderEmail(alertType: string, userEmail: string, metadata: any): string {
  const timestamp = new Date().toLocaleString('pt-BR');

  switch (alertType) {
    case 'suspicious_login':
      return `
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
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>IP:</strong> ${metadata.ipAddress || 'Desconhecido'}</p>
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Localização:</strong> ${metadata.location || 'Localização desconhecida'}</p>
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Data/Hora:</strong> ${timestamp}</p>
              </div>
              <p style="color: #dc2626; font-size: 16px; font-weight: 600;">
                Se não foi você quem tentou fazer login, recomendamos que você altere sua senha imediatamente.
              </p>
            </div>
          </body>
        </html>
      `;

    case 'failed_auth':
      return `
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
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Tentativas:</strong> ${metadata.attemptCount || 0}</p>
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>IP:</strong> ${metadata.ipAddress || 'Desconhecido'}</p>
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Última tentativa:</strong> ${timestamp}</p>
              </div>
              <p style="color: #d97706; font-size: 16px; font-weight: 600;">
                Caso não tenha sido você, recomendamos a alteração de sua senha imediatamente.
              </p>
            </div>
          </body>
        </html>
      `;

    case 'admin_action':
      return `
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
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Ação:</strong> ${metadata.actionType || 'Ação administrativa'}</p>
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Data/Hora:</strong> ${timestamp}</p>
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Descrição:</strong> ${metadata.description || 'Ação realizada em sua conta'}</p>
              </div>
              <p style="color: #2563eb; font-size: 16px; font-weight: 600;">
                Caso não tenha sido você, entre em contato imediatamente com o suporte.
              </p>
            </div>
          </body>
        </html>
      `;

    case 'password_change':
      return `
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
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>IP:</strong> ${metadata.ipAddress || 'Desconhecido'}</p>
              </div>
              <p style="color: #dc2626; font-size: 16px; font-weight: 600;">
                Caso não tenha sido você, entre em contato imediatamente com a equipe de suporte.
              </p>
            </div>
          </body>
        </html>
      `;

    case 'account_locked':
      return `
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
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Motivo:</strong> ${metadata.reason || 'Múltiplas tentativas de login falhas'}</p>
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Desbloqueio em:</strong> ${metadata.unlockTime || '15 minutos'}</p>
                <p style="color: #374151; font-size: 14px; margin: 4px 0;"><strong>Bloqueado em:</strong> ${timestamp}</p>
              </div>
              <p style="color: #dc2626; font-size: 16px; font-weight: 600;">
                Você atingiu o limite de tentativas de login. Para sua segurança, sua conta será bloqueada por 15 minutos.
              </p>
            </div>
          </body>
        </html>
      `;

    default:
      throw new Error(`Unknown alert type: ${alertType}`);
  }
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
    suspicious_login: `ALERTA DE SEGURANÇA: Detectamos uma tentativa de login suspeita em sua conta de ${metadata.location || 'localização desconhecida'}. Se não foi você, altere sua senha imediatamente.`,
    failed_auth: `ALERTA: Sua conta teve ${metadata.attemptCount || 'múltiplas'} tentativas de login falhas. Se não foi você, altere sua senha agora.`,
    admin_action: `NOTIFICAÇÃO: Uma ação administrativa foi realizada em sua conta: ${metadata.actionType || 'ação não especificada'}. Caso não tenha sido você, entre em contato com o suporte.`,
    password_change: `CONFIRMAÇÃO: Sua senha foi alterada. Se não foi você, entre em contato com o suporte IMEDIATAMENTE.`,
    account_locked: `BLOQUEIO: Sua conta foi bloqueada por ${metadata.unlockTime || '15 minutos'} devido a tentativas de login suspeitas.`,
  };
  return messages[alertType] || 'Alerta de segurança em sua conta.';
}