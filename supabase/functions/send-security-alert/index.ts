import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@4.0.0";
import React from 'https://esm.sh/react@18.3.1';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22';
import { SecurityAlertEmail } from './_templates/security-alert.tsx';

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

    const displayName = userName || email.split('@')[0];

    // Determine subject based on alert type
    let subject = '';
    switch (alertType) {
      case 'failed_2fa':
        subject = '🔒 Alerta de Segurança: Tentativas Falhas de 2FA';
        break;
      case 'account_blocked':
        subject = '🔒 Alerta de Segurança: Conta Temporariamente Bloqueada';
        break;
      case 'new_device':
        subject = '🔔 Novo Dispositivo Detectado';
        break;
      case 'suspicious_login':
        subject = '⚠️ Alerta de Segurança: Atividade Suspeita Detectada';
        break;
    }

    // Render React Email template
    const html = await renderAsync(
      React.createElement(SecurityAlertEmail, {
        alertType,
        displayName,
        details: {
          ...details,
          ipAddress: clientIp,
        },
      })
    );

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
