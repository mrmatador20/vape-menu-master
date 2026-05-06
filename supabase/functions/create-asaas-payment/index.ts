import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      orderId,
      amount,
      description,
      paymentMethod, // 'pix' | 'credit' | 'debit'
      payerName,
      payerEmail,
      payerCpf,
      payerPhone,
    } = await req.json();

    if (!orderId || !amount || !paymentMethod) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payerCpf) {
      return new Response(JSON.stringify({ error: 'CPF é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cpfNumbers = String(payerCpf).replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      return new Response(JSON.stringify({ error: 'CPF inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ASAAS_API_KEY');
    if (!apiKey) {
      console.error('[Asaas] API key not configured');
      return new Response(JSON.stringify({ error: 'Pagamento indisponível' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Valor inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const roundedAmount = parseFloat(numAmount.toFixed(2));

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'NebulaVape/1.0',
    };

    // 1. Create or find customer
    const customerName = payerName?.toString().substring(0, 100) || 'Cliente';
    const customerEmail = payerEmail?.toString() || `cliente-${cpfNumbers}@nebulavape.com`;

    const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: customerName,
        cpfCnpj: cpfNumbers,
        email: customerEmail,
        mobilePhone: payerPhone ? String(payerPhone).replace(/\D/g, '') : undefined,
        externalReference: orderId,
        notificationDisabled: true,
      }),
    });

    if (!customerRes.ok) {
      const txt = await customerRes.text();
      console.error('[Asaas] Customer error:', customerRes.status, txt);
      return new Response(JSON.stringify({ error: 'Erro ao criar cliente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const customer = await customerRes.json();

    // 2. Create payment
    const billingType = paymentMethod === 'pix' ? 'PIX' : (paymentMethod === 'debit' ? 'DEBIT_CARD' : 'CREDIT_CARD');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const paymentBody: any = {
      customer: customer.id,
      billingType,
      value: roundedAmount,
      dueDate: dueDate.toISOString().split('T')[0],
      description: String(description || `Pedido ${orderId}`).substring(0, 500),
      externalReference: orderId,
    };

    const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentBody),
    });

    if (!paymentRes.ok) {
      const txt = await paymentRes.text();
      console.error('[Asaas] Payment error:', paymentRes.status, txt);
      return new Response(JSON.stringify({ error: 'Erro ao criar pagamento' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const payment = await paymentRes.json();
    console.log('[Asaas] Payment created:', payment.id);

    // 3. For PIX, fetch QR code
    let qrCodeBase64: string | null = null;
    let pixPayload: string | null = null;

    if (billingType === 'PIX') {
      const qrRes = await fetch(`${ASAAS_BASE_URL}/payments/${payment.id}/pixQrCode`, {
        method: 'GET',
        headers,
      });
      if (qrRes.ok) {
        const qr = await qrRes.json();
        qrCodeBase64 = qr.encodedImage;
        pixPayload = qr.payload;
      } else {
        console.error('[Asaas] QR Code error:', await qrRes.text());
      }
    }

    // 4. Update order
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await supabase.from('orders').update({ status: 'pending_payment' }).eq('id', orderId);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        billingType,
        invoiceUrl: payment.invoiceUrl,
        qrCodeBase64,
        qrCode: pixPayload,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Asaas] Error:', error);
    return new Response(JSON.stringify({ error: 'Erro ao processar pagamento' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
