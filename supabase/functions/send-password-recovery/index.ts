import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_PASSWORD_RESET_HOOK_SECRET') as string

function generatePasswordRecoveryEmail(userEmail: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinição de Senha - Vape Menu Express</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1419; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1a2332; border-radius: 12px; overflow: hidden; box-shadow: 0 0 40px rgba(0, 204, 255, 0.2);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #00ccff 0%, #00d9a3 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #0f1419; font-size: 32px; font-weight: bold; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                Vape-Menu-Express
              </h1>
              <p style="color: #0f1419; font-size: 14px; margin: 0; opacity: 0.9;">
                Sua loja de vapes de confiança
              </p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #e6fffd; font-size: 28px; font-weight: bold; margin: 0 0 24px 0; text-align: center;">
                🔐 Redefinição de Senha
              </h2>

              <p style="color: #e6fffd; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Olá, <strong>${userEmail}</strong>!
              </p>

              <p style="color: #e6fffd; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Recebemos uma solicitação para redefinir a senha da sua conta.
                Se você não fez esta solicitação, pode ignorar este email com segurança.
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="background-color: #00ccff; border-radius: 8px; color: #0f1419; font-size: 18px; font-weight: bold; text-decoration: none; display: inline-block; padding: 16px 48px; box-shadow: 0 4px 12px rgba(0, 204, 255, 0.4);">
                      Redefinir Minha Senha
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #00d9a3; font-size: 14px; text-align: center; margin: 24px 0; padding: 12px; background-color: rgba(0, 217, 163, 0.1); border-radius: 6px; border: 1px solid rgba(0, 217, 163, 0.3);">
                Este link é válido por <strong>1 hora</strong> e pode ser usado apenas uma vez.
              </p>

              <!-- Security section -->
              <table role="presentation" style="width: 100%; background-color: rgba(0, 204, 255, 0.05); border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid rgba(0, 204, 255, 0.2);">
                <tr>
                  <td>
                    <p style="color: #00ccff; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">
                      🛡️ Dicas de Segurança:
                    </p>
                    <p style="color: #a3d9e6; font-size: 14px; line-height: 22px; margin: 0;">
                      • Nunca compartilhe sua senha com ninguém<br>
                      • Use uma senha forte e única<br>
                      • Ative a autenticação de dois fatores para maior segurança
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #a3d9e6; font-size: 13px; line-height: 20px; margin: 24px 0 8px 0;">
                Se você não conseguir clicar no botão, copie e cole este link no seu navegador:
              </p>
              <p style="color: #00d9a3; font-size: 12px; word-break: break-all; background-color: rgba(0, 217, 163, 0.1); padding: 12px; border-radius: 6px; border: 1px solid rgba(0, 217, 163, 0.2);">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #14202e; padding: 24px 40px; text-align: center;">
              <p style="color: #7a8fa3; font-size: 12px; margin: 4px 0;">
                © ${new Date().getFullYear()} Vape-Menu-Express. Todos os direitos reservados.
              </p>
              <p style="color: #7a8fa3; font-size: 12px; margin: 4px 0;">
                Este é um email automático, por favor não responda.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 400 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(hookSecret)
  
  try {
    const {
      user,
      email_data: { token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const resetUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
    
    const html = generatePasswordRecoveryEmail(user.email, resetUrl)

    const { error } = await resend.emails.send({
      from: 'Vape-Menu-Express <no-reply@resend.dev>',
      to: [user.email],
      subject: '🔐 Redefinição de Senha - Vape-Menu-Express',
      html,
    })
    
    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending password recovery email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({
        error: {
          message: errorMessage,
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
