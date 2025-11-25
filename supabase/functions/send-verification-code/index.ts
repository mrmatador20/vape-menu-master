import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  purpose: 'password_change' | 'login';
  email?: string;
}

// Generate 6-digit code
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create HTML email template
const createEmailHTML = (code: string, userName: string, purpose: string): string => {
  const purposeText = purpose === 'password_change' 
    ? 'alterar sua senha' 
    : 'verificar sua identidade';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Verificação</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 48px 20px; text-align: center;">
                    <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 0;">
                      NebulaVape - Verificação de Segurança
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 0 48px;">
                    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 20px 0;">
                      Olá${userName ? ` ${userName}` : ''},
                    </p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 20px 0;">
                      Você solicitou ${purposeText}. Use o código abaixo para continuar:
                    </p>
                  </td>
                </tr>
                
                <!-- Code Box -->
                <tr>
                  <td style="padding: 0 48px;">
                    <div style="background: #f4f4f4; border-radius: 8px; padding: 24px; text-align: center; margin: 32px 0;">
                      <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #8B5CF6; margin: 0;">
                        ${code}
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Details -->
                <tr>
                  <td style="padding: 0 48px;">
                    <p style="color: #666; font-size: 14px; line-height: 24px; margin: 8px 0;">
                      Este código é válido por <strong>5 minutos</strong>.
                    </p>
                    
                    <p style="color: #666; font-size: 14px; line-height: 24px; margin: 8px 0;">
                      Por razões de segurança, não compartilhe este código com ninguém.
                    </p>
                    
                    <p style="color: #666; font-size: 14px; line-height: 24px; margin: 24px 0; font-style: italic;">
                      Se você não solicitou esta verificação, ignore este email e sua conta permanecerá segura.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 32px 48px 48px; text-align: center;">
                    <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 0;">
                      NebulaVape - Sua loja de vapes de confiança
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Verification code request received');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('User authentication error:', userError);
      throw new Error("Não autenticado");
    }

    const { purpose, email: providedEmail }: VerificationRequest = await req.json();
    
    console.log('Request purpose:', purpose);

    // Use provided email or user's email
    const userEmail = providedEmail || user.email;
    if (!userEmail) {
      throw new Error("Email não encontrado");
    }

    // Get user profile for name
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    // Generate verification code
    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes

    console.log('Generated code for user:', user.id);

    // Store code in database
    const { error: insertError } = await supabaseClient
      .from('email_verification_codes')
      .insert({
        user_id: user.id,
        code: code,
        purpose: purpose,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Code stored in database');

    // Create HTML email
    const html = createEmailHTML(code, profile?.full_name || '', purpose);

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: 'NebulaVape <onboarding@resend.dev>',
      to: [userEmail],
      subject: 'Código de Verificação - NebulaVape',
      html,
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      throw emailError;
    }

    console.log('Email sent successfully to:', userEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código enviado com sucesso',
        expiresIn: 5 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
