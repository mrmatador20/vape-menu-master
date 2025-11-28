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
    const { orderId, amount, description, payerEmail } = await req.json();

    if (!orderId || !amount || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payment preference
    const paymentData = {
      transaction_amount: Number(amount),
      description: description,
      payment_method_id: 'pix',
      payer: {
        email: payerEmail || 'cliente@example.com',
      },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      external_reference: orderId,
    };

    console.log('[MercadoPago] Creating payment:', paymentData);

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MercadoPago] API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentResponse = await response.json();
    console.log('[MercadoPago] Payment created successfully:', paymentResponse.id);

    // Extract QR code data
    const qrCodeBase64 = paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64;
    const qrCode = paymentResponse.point_of_interaction?.transaction_data?.qr_code;
    const paymentId = paymentResponse.id;

    if (!qrCodeBase64 && !qrCode) {
      console.error('[MercadoPago] No QR code in response');
      return new Response(
        JSON.stringify({ error: 'QR code not available in response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store payment info in database for webhook verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from('orders')
      .update({ 
        status: 'pending_payment',
      })
      .eq('id', orderId);

    if (dbError) {
      console.error('[MercadoPago] Error updating order:', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentId,
        qrCodeBase64: qrCodeBase64,
        qrCode: qrCode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MercadoPago] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
