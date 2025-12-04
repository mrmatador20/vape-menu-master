import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // SECURITY: Verify authentication token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[notify-referral-points] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('[notify-referral-points] Auth error');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { referrerId, pointsAwarded, orderId } = await req.json();

    console.log('[notify-referral-points] Processing notification');

    if (!referrerId || !pointsAwarded) {
      return new Response(
        JSON.stringify({ error: 'referrerId and pointsAwarded are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify caller has permission (must be admin or the referrer themselves)
    const isOwnNotification = user.id === referrerId;
    
    if (!isOwnNotification) {
      // Check if caller is admin
      const { data: userRole } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!userRole || userRole.role !== 'admin') {
        console.error('[notify-referral-points] Unauthorized: User is not referrer or admin');
        return new Response(
          JSON.stringify({ error: 'Forbidden - Not authorized to trigger this notification' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // SECURITY: Validate orderId if provided - ensure it exists and has valid referral
    if (orderId) {
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .select('referred_by_code, referral_points_awarded')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('[notify-referral-points] Order not found');
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify this order actually has a referral code
      if (!order.referred_by_code) {
        console.error('[notify-referral-points] Order has no referral code');
        return new Response(
          JSON.stringify({ error: 'Order has no referral' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Buscar informações do referrer
    const { data: referrerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name, referral_code')
      .eq('id', referrerId)
      .single();

    if (profileError || !referrerProfile) {
      console.error('[notify-referral-points] Referrer profile not found');
      return new Response(
        JSON.stringify({ error: 'Referrer profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Buscar email do referrer
    const { data: { user: referrerUser }, error: userError } = await supabaseClient.auth.admin.getUserById(referrerId);

    if (userError || !referrerUser?.email) {
      console.error('[notify-referral-points] Referrer email not found');
      return new Response(
        JSON.stringify({ error: 'Referrer email not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Buscar saldo atualizado de pontos
    const { data: pointsData } = await supabaseClient
      .from('referral_points')
      .select('points_balance, total_earned')
      .eq('user_id', referrerId)
      .single();

    const currentBalance = pointsData?.points_balance || 0;
    const totalEarned = pointsData?.total_earned || 0;

    console.log('[notify-referral-points] Sending email notification');

    // Enviar email de notificação
    const emailResponse = await resend.emails.send({
      from: 'NebulaVape <onboarding@resend.dev>',
      to: [referrerUser.email],
      subject: '🎉 Você ganhou pontos de indicação!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Roboto', 'Open Sans', Arial, sans-serif;
                background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(135deg, #00ccff 0%, #00d9a3 100%);
                border-radius: 12px;
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #00ccff 0%, #00d9a3 100%);
                padding: 40px 20px;
                text-align: center;
              }
              .header h1 {
                font-family: 'Roboto', sans-serif;
                font-size: 32px;
                font-weight: 700;
                color: #0f1419;
                margin: 0 0 10px 0;
              }
              .header p {
                font-family: 'Open Sans', sans-serif;
                font-size: 16px;
                color: #0f1419;
                margin: 0;
                opacity: 0.8;
              }
              .content {
                background: #0f1419;
                padding: 40px 30px;
              }
              .points-box {
                background: linear-gradient(135deg, rgba(0, 204, 255, 0.1) 0%, rgba(0, 217, 163, 0.1) 100%);
                border: 2px solid #00ccff;
                border-radius: 8px;
                padding: 30px;
                text-align: center;
                margin-bottom: 30px;
              }
              .points-number {
                font-size: 48px;
                font-weight: 700;
                color: #00ccff;
                margin: 10px 0;
              }
              .points-label {
                font-size: 18px;
                color: #e6fffd;
                margin: 5px 0;
              }
              .info-text {
                color: #e6fffd;
                font-size: 16px;
                line-height: 1.6;
                margin: 15px 0;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin: 25px 0;
              }
              .stat-card {
                background: rgba(0, 204, 255, 0.05);
                border: 1px solid rgba(0, 204, 255, 0.2);
                border-radius: 8px;
                padding: 20px;
                text-align: center;
              }
              .stat-value {
                font-size: 24px;
                font-weight: 700;
                color: #00ccff;
                margin: 5px 0;
              }
              .stat-label {
                font-size: 14px;
                color: #a3d9e6;
                margin: 5px 0;
              }
              .cta-button {
                display: inline-block;
                background: #00ccff;
                color: #0f1419;
                font-size: 16px;
                font-weight: 600;
                padding: 15px 30px;
                border-radius: 8px;
                text-decoration: none;
                margin: 20px 0;
              }
              .footer {
                background: #0f1419;
                padding: 20px;
                text-align: center;
                color: #7a8fa3;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Parabéns, ${referrerProfile.full_name || 'Cliente'}!</h1>
                <p>Você ganhou pontos de indicação</p>
              </div>
              
              <div class="content">
                <div class="points-box">
                  <div class="points-label">Você ganhou</div>
                  <div class="points-number">+${pointsAwarded}</div>
                  <div class="points-label">pontos</div>
                </div>
                
                <p class="info-text">
                  Um pedido feito usando seu código de indicação <strong>${referrerProfile.referral_code}</strong> foi confirmado! 
                  Agora você tem mais pontos para trocar por recompensas incríveis.
                </p>
                
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-value">${currentBalance}</div>
                    <div class="stat-label">Saldo Atual</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${totalEarned}</div>
                    <div class="stat-label">Total Ganho</div>
                  </div>
                </div>
                
                <p class="info-text" style="text-align: center; margin-top: 30px;">
                  Continue compartilhando seu código <strong>${referrerProfile.referral_code}</strong> para ganhar mais pontos!
                </p>
                
                <div style="text-align: center;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/profile" class="cta-button">
                    Ver Minhas Recompensas
                  </a>
                </div>
              </div>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} NebulaVape - Sua loja de vapes de confiança</p>
                <p style="margin-top: 10px;">Este é um email automático, não responda.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('[notify-referral-points] Email sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-referral-points] Error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
