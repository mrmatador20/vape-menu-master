import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityAlertRequest {
  userId: string;
  email: string;
  userName: string;
  alertType: "suspicious_login" | "failed_auth" | "admin_action" | "password_change";
  eventDetails: {
    ipAddress?: string;
    location?: string;
    deviceInfo?: string;
    timestamp: string;
    attemptCount?: number;
    actionType?: string;
    actionDescription?: string;
  };
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Segurança <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
}

function generateEmailHTML(alertRequest: SecurityAlertRequest): { subject: string; html: string } {
  const { alertType, userName, eventDetails } = alertRequest;
  
  const baseStyle = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #ffffff; }
      .container { max-width: 560px; margin: 0 auto; padding: 20px; }
      .header { margin: 40px 0; }
      h1 { font-size: 24px; font-weight: bold; margin: 0; }
      .info-box { background-color: #f3f4f6; border-radius: 4px; padding: 16px; margin: 16px 0; }
      .info-text { margin: 8px 0; font-size: 14px; line-height: 20px; color: #333; }
      .text { font-size: 14px; line-height: 24px; color: #333; margin: 16px 0; }
      .alert-text { font-size: 14px; line-height: 24px; color: #dc2626; margin: 16px 0; font-weight: 600; }
      .footer { font-size: 12px; line-height: 22px; color: #898989; margin-top: 24px; }
      .security-tip { background-color: #dbeafe; color: #1e40af; padding: 12px; border-radius: 4px; margin: 24px 0; }
    </style>
  `;

  if (alertType === "suspicious_login") {
    return {
      subject: "⚠️ Alerta de Segurança: Login Suspeito Detectado",
      html: `
        <!DOCTYPE html>
        <html>
        <head>${baseStyle}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #dc2626;">⚠️ Alerta de Segurança</h1>
            </div>
            <p class="text">Olá ${userName},</p>
            <p class="text">Detectamos uma tentativa de login em sua conta de um dispositivo ou localização incomum.</p>
            <div class="info-box">
              <p class="info-text"><strong>Endereço IP:</strong> ${eventDetails.ipAddress || "Desconhecido"}</p>
              <p class="info-text"><strong>Localização:</strong> ${eventDetails.location || "Desconhecida"}</p>
              <p class="info-text"><strong>Data/Hora:</strong> ${eventDetails.timestamp}</p>
              <p class="info-text"><strong>Dispositivo:</strong> ${eventDetails.deviceInfo || "Desconhecido"}</p>
            </div>
            <p class="text"><strong>Se não foi você:</strong></p>
            <p class="text">
              • Altere sua senha imediatamente<br/>
              • Verifique sua configuração de autenticação de dois fatores<br/>
              • Entre em contato com nosso suporte
            </p>
            <p class="text"><strong>Se foi você:</strong></p>
            <p class="text">Você pode ignorar esta mensagem. Seu dispositivo foi registrado como confiável.</p>
            <p class="footer">Este é um e-mail automático de segurança. Por favor, não responda a esta mensagem.</p>
          </div>
        </body>
        </html>
      `
    };
  }

  if (alertType === "failed_auth") {
    return {
      subject: "🔒 Alerta de Segurança: Múltiplas Falhas de Login",
      html: `
        <!DOCTYPE html>
        <html>
        <head>${baseStyle}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #dc2626;">🔒 Alerta de Segurança</h1>
            </div>
            <p class="text">Olá ${userName},</p>
            <p class="text">Sua conta sofreu <strong>${eventDetails.attemptCount || 0} tentativas de login falhadas</strong> recentemente.</p>
            <div class="info-box">
              <p class="info-text"><strong>Última tentativa:</strong> ${eventDetails.timestamp}</p>
              <p class="info-text"><strong>Endereço IP:</strong> ${eventDetails.ipAddress || "Desconhecido"}</p>
              <p class="info-text"><strong>Total de tentativas:</strong> ${eventDetails.attemptCount || 0}</p>
            </div>
            <p class="alert-text">⚠️ Se você não reconhece essas tentativas, recomendamos:</p>
            <p class="text">
              • <strong>Alterar sua senha imediatamente</strong><br/>
              • Ativar autenticação de dois fatores (2FA)<br/>
              • Verificar dispositivos conectados à sua conta<br/>
              • Entrar em contato com nosso suporte
            </p>
            <p class="text">Caso tenha sido você tentando acessar sua conta, você pode ignorar esta mensagem.</p>
            <p class="footer">Este é um e-mail automático de segurança. Por favor, não responda a esta mensagem.</p>
          </div>
        </body>
        </html>
      `
    };
  }

  if (alertType === "admin_action") {
    return {
      subject: "🔐 Notificação: Ação Administrativa Realizada",
      html: `
        <!DOCTYPE html>
        <html>
        <head>${baseStyle}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #1e40af;">🔐 Notificação de Segurança</h1>
            </div>
            <p class="text">Olá ${userName},</p>
            <p class="text">Uma ação sensível foi realizada em sua conta.</p>
            <div class="info-box">
              <p class="info-text"><strong>Ação:</strong> ${eventDetails.actionType || "Não especificada"}</p>
              <p class="info-text"><strong>Descrição:</strong> ${eventDetails.actionDescription || ""}</p>
              <p class="info-text"><strong>Data/Hora:</strong> ${eventDetails.timestamp}</p>
              <p class="info-text"><strong>Endereço IP:</strong> ${eventDetails.ipAddress || "Desconhecido"}</p>
            </div>
            <p class="alert-text">⚠️ Caso você não tenha realizado esta ação:</p>
            <p class="text">
              • Entre em contato imediatamente com nosso suporte<br/>
              • Altere sua senha<br/>
              • Verifique dispositivos conectados<br/>
              • Revise suas configurações de segurança
            </p>
            <p class="text">Se você reconhece esta ação, pode ignorar esta mensagem.</p>
            <p class="footer">Este é um e-mail automático de segurança. Por favor, não responda a esta mensagem.</p>
          </div>
        </body>
        </html>
      `
    };
  }

  // password_change
  return {
    subject: "🔑 Confirmação: Senha Alterada",
    html: `
      <!DOCTYPE html>
      <html>
      <head>${baseStyle}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #059669;">🔑 Alteração de Senha</h1>
          </div>
          <p class="text">Olá ${userName},</p>
          <p class="text">Sua senha foi <strong>alterada com sucesso</strong>.</p>
          <div class="info-box">
            <p class="info-text"><strong>Data/Hora:</strong> ${eventDetails.timestamp}</p>
            <p class="info-text"><strong>Endereço IP:</strong> ${eventDetails.ipAddress || "Desconhecido"}</p>
            <p class="info-text"><strong>Dispositivo:</strong> ${eventDetails.deviceInfo || "Desconhecido"}</p>
          </div>
          <p class="alert-text">⚠️ Caso você não tenha realizado esta alteração:</p>
          <p class="text">
            • <strong>Entre em contato imediatamente com nosso suporte</strong><br/>
            • Sua conta pode estar comprometida<br/>
            • Recomendamos recuperar o acesso através da opção "Esqueci minha senha"
          </p>
          <p class="text">Se você reconhece esta alteração, está tudo certo! Certifique-se de usar uma senha forte e única.</p>
          <div class="security-tip">
            💡 <strong>Dica de segurança:</strong> Use um gerenciador de senhas e ative a autenticação de dois fatores para maior proteção.
          </div>
          <p class="footer">Este é um e-mail automático de segurança. Por favor, não responda a esta mensagem.</p>
        </div>
      </body>
      </html>
    `
  };
}

async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      console.error("Twilio credentials not configured");
      return false;
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: twilioPhone,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio SMS error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const alertRequest: SecurityAlertRequest = await req.json();
    console.log("Processing security alert:", alertRequest.alertType);

    // Get user notification preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", alertRequest.userId)
      .single();

    // Check if user wants notifications for this event type
    const shouldNotify = preferences ? (
      (alertRequest.alertType === "suspicious_login" && preferences.notify_suspicious_login) ||
      (alertRequest.alertType === "failed_auth" && preferences.notify_failed_login) ||
      (alertRequest.alertType === "password_change" && preferences.notify_password_change) ||
      (alertRequest.alertType === "admin_action" && preferences.notify_admin_actions)
    ) : true; // Default to true if no preferences set

    if (!shouldNotify) {
      console.log("User has disabled notifications for this event type");
      return new Response(
        JSON.stringify({ message: "Notifications disabled by user" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: { email?: string; sms?: string } = {};

    // Send Email via Resend
    if (!preferences || preferences.email_enabled !== false) {
      try {
        const { subject, html } = generateEmailHTML(alertRequest);
        await sendResendEmail(alertRequest.email, subject, html);
        
        console.log("Email sent successfully");
        results.email = "sent";
        
        // Log successful notification
        await supabase.from("security_notification_logs").insert({
          user_id: alertRequest.userId,
          notification_type: alertRequest.alertType,
          channel: "email",
          recipient: alertRequest.email,
          event_type: alertRequest.alertType,
          event_metadata: alertRequest.eventDetails,
          delivery_status: "sent",
        });
      } catch (error: any) {
        console.error("Error sending email:", error);
        results.email = "error";
        
        await supabase.from("security_notification_logs").insert({
          user_id: alertRequest.userId,
          notification_type: alertRequest.alertType,
          channel: "email",
          recipient: alertRequest.email,
          event_type: alertRequest.alertType,
          event_metadata: alertRequest.eventDetails,
          delivery_status: "failed",
          error_message: error.message,
        });
      }
    }

    // Send SMS via Twilio (if enabled and phone configured)
    if (preferences?.sms_enabled && preferences?.phone_number) {
      try {
        let smsMessage = "";

        switch (alertRequest.alertType) {
          case "suspicious_login":
            smsMessage = `Alerta de Segurança: Detectamos login suspeito em sua conta. Se não foi você, altere sua senha imediatamente.`;
            break;
          case "failed_auth":
            smsMessage = `Alerta: Sua conta teve ${alertRequest.eventDetails.attemptCount} tentativas de login falhadas. Verifique sua conta.`;
            break;
          case "admin_action":
            smsMessage = `Notificação: ${alertRequest.eventDetails.actionType} foi realizada em sua conta. Caso não tenha sido você, entre em contato conosco.`;
            break;
          case "password_change":
            smsMessage = `Confirmação: Sua senha foi alterada. Se não foi você, entre em contato imediatamente.`;
            break;
        }

        const smsSent = await sendSMS(preferences.phone_number, smsMessage);
        results.sms = smsSent ? "sent" : "failed";

        // Log SMS notification
        await supabase.from("security_notification_logs").insert({
          user_id: alertRequest.userId,
          notification_type: alertRequest.alertType,
          channel: "sms",
          recipient: preferences.phone_number,
          event_type: alertRequest.alertType,
          event_metadata: alertRequest.eventDetails,
          delivery_status: smsSent ? "sent" : "failed",
          error_message: smsSent ? null : "SMS delivery failed",
        });
      } catch (error: any) {
        console.error("Error sending SMS:", error);
        results.sms = "error";
        
        await supabase.from("security_notification_logs").insert({
          user_id: alertRequest.userId,
          notification_type: alertRequest.alertType,
          channel: "sms",
          recipient: preferences.phone_number,
          event_type: alertRequest.alertType,
          event_metadata: alertRequest.eventDetails,
          delivery_status: "failed",
          error_message: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
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
