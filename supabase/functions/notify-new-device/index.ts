import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyNewDeviceRequest {
  deviceName: string;
  deviceFingerprint: string;
  userAgent: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { deviceName, deviceFingerprint, userAgent }: NotifyNewDeviceRequest = await req.json();

    // Get user email
    const userEmail = user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const userName = profile?.full_name || 'Usuário';

    // Detect device type from user agent
    let deviceType = '💻 Computador';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iOS')) {
      deviceType = '📱 Celular';
    }

    // Send notification email
    const emailResponse = await resend.emails.send({
      from: "Vape-Menu-Express <onboarding@resend.dev>",
      to: [userEmail],
      subject: "🔒 Novo Dispositivo Confiável Adicionado",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Roboto', 'Open Sans', Arial, sans-serif;
              background-color: #0f1419;
              margin: 0;
              padding: 20px;
              color: #e6fffd;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: linear-gradient(135deg, #1a1f2e 0%, #0f1419 100%);
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0, 204, 255, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #00ccff 0%, #00d9a3 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              color: #0f1419;
              font-size: 32px;
              font-weight: 700;
            }
            .header p {
              margin: 10px 0 0 0;
              color: #1a1f2e;
              font-size: 16px;
            }
            .content {
              padding: 40px 30px;
            }
            .alert-box {
              background: rgba(0, 204, 255, 0.1);
              border: 2px solid #00ccff;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .alert-box h2 {
              margin: 0 0 15px 0;
              color: #00ccff;
              font-size: 20px;
            }
            .device-info {
              background: rgba(163, 217, 230, 0.05);
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .device-info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid rgba(163, 217, 230, 0.1);
            }
            .device-info-row:last-child {
              border-bottom: none;
            }
            .device-info-label {
              color: #a3d9e6;
              font-weight: 600;
            }
            .device-info-value {
              color: #e6fffd;
              text-align: right;
            }
            .button {
              display: inline-block;
              background: #00ccff;
              color: #0f1419;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
            }
            .security-tips {
              background: rgba(0, 204, 255, 0.05);
              border-radius: 8px;
              padding: 20px;
              margin-top: 30px;
            }
            .security-tips h3 {
              color: #00ccff;
              margin-top: 0;
            }
            .security-tips ul {
              margin: 15px 0;
              padding-left: 20px;
              color: #a3d9e6;
            }
            .security-tips li {
              margin: 8px 0;
              line-height: 1.6;
            }
            .footer {
              text-align: center;
              padding: 30px;
              color: #7a8fa3;
              font-size: 14px;
            }
            .footer a {
              color: #00ccff;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛡️ Vape-Menu-Express</h1>
              <p>Sua loja de vapes de confiança</p>
            </div>
            
            <div class="content">
              <div class="alert-box">
                <h2>🔔 Novo Dispositivo Confiável</h2>
                <p>Olá ${userName},</p>
                <p>Um novo dispositivo foi adicionado à lista de dispositivos confiáveis da sua conta. Este dispositivo não precisará de verificação 2FA pelos próximos 30 dias.</p>
              </div>

              <div class="device-info">
                <div class="device-info-row">
                  <span class="device-info-label">Dispositivo:</span>
                  <span class="device-info-value">${deviceType}</span>
                </div>
                <div class="device-info-row">
                  <span class="device-info-label">Nome:</span>
                  <span class="device-info-value">${deviceName}</span>
                </div>
                <div class="device-info-row">
                  <span class="device-info-label">Data:</span>
                  <span class="device-info-value">${new Date().toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}</span>
                </div>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <p style="margin-bottom: 15px; color: #e6fffd;">
                  <strong>Não foi você?</strong> Revogue este dispositivo imediatamente.
                </p>
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/trusted-devices" class="button">
                  Gerenciar Dispositivos
                </a>
              </div>

              <div class="security-tips">
                <h3>💡 Dicas de Segurança</h3>
                <ul>
                  <li>Nunca compartilhe sua senha com ninguém</li>
                  <li>Use senhas fortes e únicas para cada serviço</li>
                  <li>Mantenha a verificação em duas etapas (2FA) sempre ativa</li>
                  <li>Revise regularmente seus dispositivos confiáveis</li>
                  <li>Se algo parecer suspeito, altere sua senha imediatamente</li>
                </ul>
              </div>
            </div>

            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Vape-Menu-Express. Todos os direitos reservados.</p>
              <p>
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/profile">Acessar Perfil</a> | 
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/trusted-devices">Gerenciar Dispositivos</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Device notification email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.data?.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-new-device function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
