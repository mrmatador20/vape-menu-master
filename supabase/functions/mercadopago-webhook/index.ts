import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

async function verifyWebhookSignature(req: Request, body: any): Promise<boolean> {
  const secret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
  if (!secret) {
    console.error('[MercadoPago Webhook] Webhook secret not configured - rejecting request');
    return false; // Reject if no secret configured
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  
  if (!xSignature || !xRequestId) {
    console.error('[MercadoPago Webhook] Missing signature headers');
    return false;
  }

  try {
    // Extract ts and hash from x-signature header (format: "ts=123456,v1=hash")
    const parts = xSignature.split(',');
    const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
    const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!ts || !hash) {
      console.error('[MercadoPago Webhook] Invalid signature format');
      return false;
    }

    // Create the manifest string: id + request-id + ts
    const dataId = body?.data?.id || body?.resource;
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Generate HMAC SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(manifest);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const calculatedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const isValid = calculatedHash === hash;
    if (!isValid) {
      console.error('[MercadoPago Webhook] Invalid signature');
    }
    
    return isValid;
  } catch (error) {
    console.error('[MercadoPago Webhook] Signature verification error:', error);
    return false;
  }
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function processWebhookWithRetry(body: any, attempt = 1): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log(`[MercadoPago Webhook] Processing attempt ${attempt}/${MAX_RETRIES}`);

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'No payment ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Access token not configured');
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!paymentResponse.ok) {
      throw new Error(`Failed to fetch payment: ${paymentResponse.status}`);
    }

    const payment = await paymentResponse.json();
    const orderId = payment.external_reference;
    
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'No order reference' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let orderStatus = 'pending_payment';
    if (payment.status === 'approved') {
      orderStatus = 'confirmed';
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      orderStatus = 'cancelled';
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: orderStatus })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    // Send confirmation email and push notification if payment approved
    if (orderStatus === 'confirmed') {
      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select('*, profiles!inner(full_name)')
          .eq('id', orderId)
          .single();

        if (orderData) {
          const { data: userData } = await supabase.auth.admin.getUserById(orderData.user_id);
          
          if (userData?.user?.email) {
            const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
            
            await resend.emails.send({
              from: 'Vape-Menu-Express <onboarding@resend.dev>',
              to: [userData.user.email],
              subject: '✅ Pagamento PIX Confirmado - Vape-Menu-Express',
              html: `
                <div style="font-family: 'Roboto', 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #00ccff 0%, #00d9a3 100%); padding: 40px 20px; border-radius: 12px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #0f1419; font-size: 32px; font-weight: bold; margin: 0;">Vape-Menu-Express</h1>
                    <p style="color: #7a8fa3; font-size: 14px; margin: 5px 0;">Sua loja de vapes de confiança</p>
                  </div>
                  
                  <div style="background: #0f1419; padding: 30px; border-radius: 8px; color: #e6fffd;">
                    <h2 style="color: #00ccff; font-size: 24px; margin-top: 0;">🎉 Pagamento Confirmado!</h2>
                    
                    <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                      Olá ${orderData.profiles?.full_name || 'Cliente'},
                    </p>
                    
                    <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                      Seu pagamento PIX foi confirmado com sucesso!
                    </p>
                    
                    <div style="background: rgba(0, 204, 255, 0.1); padding: 20px; border-radius: 8px; border-left: 4px solid #00ccff; margin: 25px 0;">
                      <p style="margin: 5px 0;"><strong>Pedido:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
                      <p style="margin: 5px 0;"><strong>Valor:</strong> R$ ${Number(orderData.total_amount).toFixed(2)}</p>
                      <p style="margin: 5px 0;"><strong>Status:</strong> Confirmado</p>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                      Seu pedido está sendo preparado e logo estará a caminho!
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://wa.me/5583996694806" style="display: inline-block; background: #00ccff; color: #0f1419; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                        Falar com a Loja
                      </a>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #7a8fa3; font-size: 12px; margin: 5px 0;">
                      © ${new Date().getFullYear()} Vape-Menu-Express. Todos os direitos reservados.
                    </p>
                  </div>
                </div>
              `,
            });
            
            console.log('[MercadoPago Webhook] Confirmation email sent');
          }
        }
      } catch (emailError) {
        console.error('[MercadoPago Webhook] Email error (non-critical):', emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, orderId, status: orderStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[MercadoPago Webhook] Attempt ${attempt} failed:`, error);
    
    if (attempt < MAX_RETRIES) {
      console.log(`[MercadoPago Webhook] Retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return processWebhookWithRetry(body, attempt + 1);
    }
    
    console.error('[MercadoPago Webhook] All retry attempts failed');
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.log('[MercadoPago Webhook] Empty or invalid JSON body - likely a test request');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[MercadoPago Webhook] Received:', JSON.stringify(body, null, 2));

    // Verify webhook signature
    const isValidSignature = await verifyWebhookSignature(req, body);
    if (!isValidSignature) {
      console.error('[MercadoPago Webhook] Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // MercadoPago sends different event types
    if (body.type !== 'payment') {
      console.log('[MercadoPago Webhook] Ignoring non-payment event:', body.type);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return await processWebhookWithRetry(body);

  } catch (error) {
    console.error('[MercadoPago Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
