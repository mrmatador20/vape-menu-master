import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[MercadoPago Webhook] Received:', JSON.stringify(body, null, 2));

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

    let orderStatus = 'pending';
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
