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
    const { orderId, amount, description, payerEmail, payerCpf } = await req.json();

    // Validação rigorosa de campos obrigatórios
    if (!orderId || !amount || !description) {
      console.error('[MercadoPago] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Dados incompletos para processamento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação de CPF obrigatório para PIX
    if (!payerCpf) {
      console.error('[MercadoPago] Missing CPF for PIX payment');
      return new Response(
        JSON.stringify({ error: 'CPF é obrigatório para pagamento PIX' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação de formato de CPF (apenas números, 11 dígitos)
    const cpfNumbers = payerCpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      console.error('[MercadoPago] Invalid CPF format');
      return new Response(
        JSON.stringify({ error: 'CPF inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação de formato de email
    if (payerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      console.error('[MercadoPago] Invalid email format');
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação de valor mínimo
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.error('[MercadoPago] Invalid amount');
      return new Response(
        JSON.stringify({ error: 'Valor inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificação segura de credenciais (não expor detalhes)
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('[MercadoPago] Access token not configured');
      return new Response(
        JSON.stringify({ error: 'Serviço de pagamento temporariamente indisponível' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar dados do pagamento (sanitizados)
    const paymentData = {
      transaction_amount: numAmount,
      description: String(description).substring(0, 256), // Limitar tamanho
      payment_method_id: 'pix',
      payer: {
        email: payerEmail || 'cliente@example.com',
        identification: {
          type: 'CPF',
          number: cpfNumbers, // Usar apenas números
        },
      },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      external_reference: String(orderId).substring(0, 256), // Limitar tamanho
    };

    console.log('[MercadoPago] Creating payment for order:', orderId);

    // Generate unique idempotency key for this request
    const idempotencyKey = `${orderId}-${Date.now()}`;

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MercadoPago] API error:', response.status, errorText);
      
      // Não expor detalhes internos ao cliente
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível processar o pagamento PIX. Tente novamente.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ error: 'Código PIX não disponível. Tente novamente.' }),
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
    // Não expor detalhes do erro interno ao cliente
    return new Response(
      JSON.stringify({ error: 'Erro ao processar pagamento PIX. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
