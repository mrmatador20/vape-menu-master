import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { SuspiciousLoginEmail } from './_templates/suspicious-login.tsx';
import { FailedLoginEmail } from './_templates/failed-login.tsx';
import { PasswordChangedEmail } from './_templates/password-changed.tsx';
import { AccountLockedEmail } from './_templates/account-locked.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') as string;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') as string;
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityAlertRequest {
  userId: string;
  email: string;
  phone?: string;
  alertType: 'suspicious_login' | 'failed_login' | 'password_changed' | 'account_locked' | 'admin_action';
  metadata: {
    userName?: string;
    ipAddress?: string;
    location?: string;
    timestamp?: string;
    attemptCount?: number;
    lockDuration?: string;
    reason?: string;
    actionType?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const alertData: SecurityAlertRequest = await req.json();
    console.log('Processing security alert:', alertData.alertType);

    // Check user notification preferences
    const { data: preferences } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', alertData.userId)
      .single();

    const shouldNotifyEmail = preferences?.email_enabled !== false;
    const shouldNotifySMS = preferences?.sms_enabled === true && alertData.phone;

    // Map alert types to preference fields
    const preferenceMap = {
      suspicious_login: 'notify_suspicious_login',
      failed_login: 'notify_failed_login',
      password_changed: 'notify_password_change',
      account_locked: 'notify_account_locked',
      admin_action: 'notify_admin_actions',
    };

    const preferenceField = preferenceMap[alertData.alertType];
    const isAlertEnabled = !preferences || preferences[preferenceField] !== false;

    if (!isAlertEnabled) {
      console.log('User has disabled this notification type');
      return new Response(
        JSON.stringify({ message: 'Notification disabled by user preference' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Send email notification
    if (shouldNotifyEmail) {
      try {
        const emailHtml = await generateEmailTemplate(alertData);
        const emailSubject = getEmailSubject(alertData.alertType);

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Segurança <security@resend.dev>',
          to: [alertData.email],
          subject: emailSubject,
          html: emailHtml,
        });

        if (emailError) {
          console.error('Email send error:', emailError);
          results.push({ channel: 'email', status: 'failed', error: emailError.message });
        } else {
          console.log('Email sent successfully:', emailData);
          results.push({ channel: 'email', status: 'sent' });
        }

        // Log email notification
        await supabaseClient.from('security_notification_logs').insert({
          user_id: alertData.userId,
          notification_type: alertData.alertType,
          channel: 'email',
          recipient: alertData.email,
          event_type: alertData.alertType,
          event_metadata: alertData.metadata,
          delivery_status: emailError ? 'failed' : 'sent',
          error_message: emailError?.message,
        });
      } catch (emailError) {
        console.error('Email processing error:', emailError);
        results.push({ channel: 'email', status: 'failed', error: String(emailError) });
      }
    }

    // Send SMS notification
    if (shouldNotifySMS && alertData.phone) {
      try {
        const smsMessage = generateSMSMessage(alertData);
        
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: alertData.phone,
            Body: smsMessage,
          }),
        });

        const smsResult = await response.json();

        if (!response.ok) {
          console.error('SMS send error:', smsResult);
          results.push({ channel: 'sms', status: 'failed', error: smsResult.message });
        } else {
          console.log('SMS sent successfully:', smsResult);
          results.push({ channel: 'sms', status: 'sent' });
        }

        // Log SMS notification
        await supabaseClient.from('security_notification_logs').insert({
          user_id: alertData.userId,
          notification_type: alertData.alertType,
          channel: 'sms',
          recipient: alertData.phone,
          event_type: alertData.alertType,
          event_metadata: alertData.metadata,
          delivery_status: response.ok ? 'sent' : 'failed',
          error_message: response.ok ? null : smsResult.message,
        });
      } catch (smsError) {
        console.error('SMS processing error:', smsError);
        results.push({ channel: 'sms', status: 'failed', error: String(smsError) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-security-alert function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateEmailTemplate(alertData: SecurityAlertRequest): Promise<string> {
  const { alertType, metadata } = alertData;
  const userName = metadata.userName || 'Usuário';
  const timestamp = metadata.timestamp || new Date().toLocaleString('pt-BR');
  const ipAddress = metadata.ipAddress || 'Desconhecido';

  let emailComponent;

  switch (alertType) {
    case 'suspicious_login':
      emailComponent = React.createElement(SuspiciousLoginEmail, {
        userName,
        ipAddress,
        location: metadata.location,
        timestamp,
      });
      break;
    case 'failed_login':
      emailComponent = React.createElement(FailedLoginEmail, {
        userName,
        attemptCount: metadata.attemptCount || 1,
        ipAddress,
        timestamp,
      });
      break;
    case 'password_changed':
      emailComponent = React.createElement(PasswordChangedEmail, {
        userName,
        timestamp,
        ipAddress,
      });
      break;
    case 'account_locked':
      emailComponent = React.createElement(AccountLockedEmail, {
        userName,
        lockDuration: metadata.lockDuration || '15 minutos',
        timestamp,
        reason: metadata.reason || 'Múltiplas tentativas falhas de login',
      });
      break;
    default:
      throw new Error(`Unknown alert type: ${alertType}`);
  }

  return await renderAsync(emailComponent);
}

function generateSMSMessage(alertData: SecurityAlertRequest): string {
  const { alertType, metadata } = alertData;

  const messages = {
    suspicious_login: `ALERTA DE SEGURANÇA: Detectamos uma tentativa de login suspeita em sua conta. Se não foi você, altere sua senha imediatamente.`,
    failed_login: `ALERTA: ${metadata.attemptCount || 1} tentativa(s) falha(s) de login detectada(s) em sua conta. Se não foi você, sua conta pode estar sob ataque.`,
    password_changed: `IMPORTANTE: Sua senha foi alterada. Se não foi você, entre em contato com o suporte IMEDIATAMENTE.`,
    account_locked: `Sua conta foi bloqueada por ${metadata.lockDuration || '15 minutos'} após múltiplas tentativas suspeitas. Entre em contato com o suporte se precisar de ajuda.`,
    admin_action: `AÇÃO ADMINISTRATIVA: ${metadata.actionType} foi realizada em sua conta. Entre em contato com o suporte se tiver dúvidas.`,
  };

  return messages[alertType] || 'Alerta de segurança da sua conta.';
}

function getEmailSubject(alertType: string): string {
  const subjects = {
    suspicious_login: '⚠️ Tentativa de Login Suspeita Detectada',
    failed_login: '🔒 Múltiplas Falhas de Login em Sua Conta',
    password_changed: '✅ Sua Senha Foi Alterada',
    account_locked: '🔐 Conta Bloqueada Temporariamente',
    admin_action: '⚙️ Ação Administrativa Realizada',
  };

  return subjects[alertType] || 'Alerta de Segurança';
}
