import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook token
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    const receivedToken = req.headers.get('asaas-access-token');
    if (!expectedToken || receivedToken !== expectedToken) {
      console.error('[Asaas Webhook] Invalid token');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const event = await req.json();
    console.log('[Asaas Webhook] Event:', event.event, event.payment?.id);

    const payment = event.payment;
    if (!payment) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderId = payment.externalReference;
    if (!orderId) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let newStatus: string | null = null;
    switch (event.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_RECEIVED_IN_CASH':
        newStatus = 'confirmed';
        break;
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_DELETED':
      case 'PAYMENT_OVERDUE':
        newStatus = 'cancelled';
        break;
    }

    if (newStatus) {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      if (error) console.error('[Asaas Webhook] Update error:', error);
      else console.log('[Asaas Webhook] Order', orderId, '->', newStatus);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Asaas Webhook] Error:', error);
    return new Response(JSON.stringify({ error: 'webhook error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
