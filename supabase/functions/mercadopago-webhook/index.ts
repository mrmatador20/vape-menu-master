import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

async function verifyWebhookSignature(req: Request, body: any): Promise<boolean> {
  const secret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
  if (!secret) {
    console.warn('[MercadoPago Webhook] No webhook secret configured - skipping validation');
    return true; // Allow if no secret configured (for backward compatibility)
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

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error('[MercadoPago Webhook] No payment ID in webhook');
      return new Response(JSON.stringify({ error: 'No payment ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get payment details from MercadoPago API
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('[MercadoPago Webhook] Access token not configured');
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!paymentResponse.ok) {
      console.error('[MercadoPago Webhook] Failed to fetch payment:', paymentResponse.status);
      return new Response(JSON.stringify({ error: 'Failed to fetch payment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payment = await paymentResponse.json();
    console.log('[MercadoPago Webhook] Payment status:', payment.status);

    const orderId = payment.external_reference;
    if (!orderId) {
      console.error('[MercadoPago Webhook] No order ID in payment');
      return new Response(JSON.stringify({ error: 'No order reference' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update order status based on payment status
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let orderStatus = 'pending_payment';
    if (payment.status === 'approved') {
      orderStatus = 'confirmed';
      console.log('[MercadoPago Webhook] Payment approved, updating to confirmed');
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      orderStatus = 'cancelled';
      console.log('[MercadoPago Webhook] Payment rejected/cancelled');
    } else {
      console.log('[MercadoPago Webhook] Payment status:', payment.status, '- keeping as pending_payment');
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: orderStatus })
      .eq('id', orderId);

    if (updateError) {
      console.error('[MercadoPago Webhook] Error updating order:', updateError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[MercadoPago Webhook] Order updated:', orderId, 'status:', orderStatus);

    return new Response(
      JSON.stringify({ success: true, orderId, status: orderStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MercadoPago Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
