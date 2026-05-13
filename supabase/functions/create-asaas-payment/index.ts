import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

// Sanitiza dados sensíveis para logs (PCI-DSS)
const safeLog = (msg: string, data?: any) => {
  if (data) {
    const cloned = JSON.parse(JSON.stringify(data));
    const strip = (o: any) => {
      if (!o || typeof o !== 'object') return;
      for (const k of Object.keys(o)) {
        if (/(card|cvv|ccv|number|holder|expiry|expir|secret|token)/i.test(k)) {
          o[k] = '[REDACTED]';
        } else if (typeof o[k] === 'object') strip(o[k]);
      }
    };
    strip(cloned);
    console.log(msg, JSON.stringify(cloned));
  } else {
    console.log(msg);
  }
};

// Rate limit em memória (anti-fraude básico)
const attempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const checkRateLimit = (key: string): boolean => {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || record.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication: require valid JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: { user: authUser }, error: authErr } = await authClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !authUser) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      orderId,
      amount,
      description,
      paymentMethod,
      payerName,
      payerEmail,
      payerCpf,
      payerPhone,
      // Dados do cartão (apenas para credit/debit) - NÃO são logados nem armazenados
      cardHolderName,
      cardNumber,
      cardExpiryMonth,
      cardExpiryYear,
      cardCcv,
      cardHolderEmail,
      cardHolderCpf,
      cardHolderPostalCode,
      cardHolderAddressNumber,
      cardHolderPhone,
    } = body;

    safeLog('[Asaas] Request received', { orderId, paymentMethod, amount });

    if (!orderId || !amount || !paymentMethod) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Anti-fraude: rate limit por orderId + IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `${orderId}:${clientIp}`;
    if (!checkRateLimit(rateLimitKey)) {
      console.warn('[Asaas] Rate limit exceeded for', clientIp);
      return new Response(JSON.stringify({ error: 'Muitas tentativas. Aguarde um instante.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // Validação para cartão
    const isCard = paymentMethod === 'credit' || paymentMethod === 'debit';
    if (isCard) {
      if (!cardNumber || !cardHolderName || !cardExpiryMonth || !cardExpiryYear || !cardCcv) {
        return new Response(JSON.stringify({ error: 'Dados do cartão incompletos' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const numClean = String(cardNumber).replace(/\D/g, '');
      if (numClean.length < 13 || numClean.length > 19) {
        return new Response(JSON.stringify({ error: 'Número do cartão inválido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const ccvClean = String(cardCcv).replace(/\D/g, '');
      if (ccvClean.length < 3 || ccvClean.length > 4) {
        return new Response(JSON.stringify({ error: 'CVV inválido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'NebulaVape/1.0',
    };

    // 1. Criar/buscar cliente
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
      console.error('[Asaas] Customer error status:', customerRes.status);
      return new Response(JSON.stringify({ error: 'Erro ao criar cliente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const customer = await customerRes.json();

    // 2. Criar pagamento
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

    // Para cartão: enviamos os dados DIRETAMENTE ao Asaas (que tokeniza/cobra na hora).
    // Os dados não são persistidos no nosso back-end nem aparecem em logs.
    if (isCard) {
      paymentBody.creditCard = {
        holderName: String(cardHolderName).substring(0, 100),
        number: String(cardNumber).replace(/\D/g, ''),
        expiryMonth: String(cardExpiryMonth).padStart(2, '0'),
        expiryYear: String(cardExpiryYear).length === 2 ? `20${cardExpiryYear}` : String(cardExpiryYear),
        ccv: String(cardCcv).replace(/\D/g, ''),
      };
      const phoneClean = (cardHolderPhone ? String(cardHolderPhone) : (payerPhone ? String(payerPhone) : '')).replace(/\D/g, '');
      if (phoneClean.length < 10 || phoneClean.length > 11) {
        return new Response(JSON.stringify({ error: 'Telefone do titular do cartão é obrigatório (com DDD).' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      let fallbackPostalCode = cardHolderPostalCode ? String(cardHolderPostalCode).replace(/\D/g, '') : '';
      let fallbackAddressNumber = cardHolderAddressNumber ? String(cardHolderAddressNumber).trim() : '';

      if (!fallbackPostalCode || fallbackPostalCode.length !== 8 || !fallbackAddressNumber) {
        const { data: orderAddress } = await supabase
          .from('orders')
          .select('cep, address_number')
          .eq('id', orderId)
          .maybeSingle();

        fallbackPostalCode = fallbackPostalCode.length === 8
          ? fallbackPostalCode
          : String(orderAddress?.cep || '').replace(/\D/g, '');
        fallbackAddressNumber = fallbackAddressNumber || String(orderAddress?.address_number || '').trim();
      }

      if (fallbackPostalCode.length !== 8) {
        return new Response(JSON.stringify({ error: 'CEP do titular do cartão é obrigatório e deve ter 8 dígitos.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      paymentBody.creditCardHolderInfo = {
        name: String(cardHolderName).substring(0, 100),
        email: cardHolderEmail || customerEmail,
        cpfCnpj: (cardHolderCpf ? String(cardHolderCpf).replace(/\D/g, '') : cpfNumbers),
        postalCode: fallbackPostalCode,
        addressNumber: fallbackAddressNumber || 'S/N',
        phone: phoneClean,
        mobilePhone: phoneClean,
      };
      paymentBody.remoteIp = clientIp;
    }

    const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentBody),
    });

    if (!paymentRes.ok) {
      const errJson = await paymentRes.json().catch(() => ({}));
      console.error('[Asaas] Payment error status:', paymentRes.status, 'code:', errJson?.errors?.[0]?.code);
      const userMsg = errJson?.errors?.[0]?.description || 'Erro ao processar pagamento';
      return new Response(JSON.stringify({ error: userMsg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const payment = await paymentRes.json();
    safeLog('[Asaas] Payment created', { id: payment.id, status: payment.status });

    // 3. Para PIX, buscar QR Code
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
        console.error('[Asaas] QR Code error status:', qrRes.status);
      }
    }

    // 4. Atualizar pedido (status final virá via webhook)
    // Para cartão, se já confirmado pelo Asaas, marcamos. Senão webhook decide.
    let orderStatus = 'pending_payment';
    if (isCard && (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED')) {
      orderStatus = 'confirmed';
    }
    await supabase.from('orders').update({ status: orderStatus }).eq('id', orderId);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        billingType,
        status: payment.status,
        confirmed: orderStatus === 'confirmed',
        qrCodeBase64,
        qrCode: pixPayload,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Asaas] Error type:', (error as Error).name);
    return new Response(JSON.stringify({ error: 'Erro ao processar pagamento' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
