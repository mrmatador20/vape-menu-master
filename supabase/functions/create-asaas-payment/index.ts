import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mapRefusal, logOrderEvent } from "../_shared/asaasRefusal.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

// Regras de parcelamento (Zero-Trust): SEMPRE lidas do banco (payment_settings)
// e recalculadas no servidor. Nunca confiar em valores vindos do frontend.
interface InstallmentRules {
  maxInterestFree: number;
  maxTotal: number;
  monthlyRate: number; // fração (ex.: 0.0299)
}
const DEFAULT_RULES: InstallmentRules = { maxInterestFree: 2, maxTotal: 12, monthlyRate: 0.0299 };
const round2 = (v: number) => Math.round(v * 100) / 100;

const fetchInstallmentRules = async (client: any): Promise<InstallmentRules> => {
  try {
    const { data, error } = await client
      .from('payment_settings')
      .select('max_interest_free_installments, max_total_installments, monthly_interest_rate')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return DEFAULT_RULES;
    const maxTotal = Math.max(1, Math.min(12, Number(data.max_total_installments) || 12));
    const maxInterestFree = Math.max(1, Math.min(maxTotal, Number(data.max_interest_free_installments) || 1));
    const ratePct = Number(data.monthly_interest_rate);
    const monthlyRate = isNaN(ratePct) || ratePct < 0 || ratePct > 15 ? DEFAULT_RULES.monthlyRate : ratePct / 100;
    return { maxInterestFree, maxTotal, monthlyRate };
  } catch (_e) {
    return DEFAULT_RULES;
  }
};

const calcInstallment = (amount: number, n: number, rules: InstallmentRules) => {
  if (n <= rules.maxInterestFree || rules.monthlyRate <= 0) {
    const installmentValue = round2(amount / n);
    return { installmentValue, totalValue: round2(installmentValue * n), hasInterest: false };
  }
  const i = rules.monthlyRate;
  const installmentValue = round2((amount * i) / (1 - Math.pow(1 + i, -n)));
  return { installmentValue, totalValue: round2(installmentValue * n), hasInterest: true };
};



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
      installmentCount,
    } = body;


    safeLog('[Asaas] Request received', { orderId, paymentMethod });

    if (!orderId || !paymentMethod) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ownership check + server-side amount: fetch authoritative total from DB
    const { data: ownerOrder, error: ownerErr } = await authClient
      .from('orders')
      .select('id, user_id, total_amount, status')
      .eq('id', orderId)
      .maybeSingle();
    if (ownerErr || !ownerOrder) {
      return new Response(JSON.stringify({ error: 'Pedido não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (ownerOrder.user_id !== authUser.id) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Prevent double-payment: only allow payment for orders awaiting payment
    if (ownerOrder.status && !['pending', 'pending_payment'].includes(ownerOrder.status)) {
      return new Response(JSON.stringify({ error: 'Pedido não está aguardando pagamento' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const amount = ownerOrder.total_amount;

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

      // Parcelamento (apenas crédito) — Zero-Trust: regras lidas do banco e recalculadas aqui
      if (paymentMethod === 'credit') {
        const rules = await fetchInstallmentRules(authClient);
        const n = parseInt(String(installmentCount ?? 1), 10);
        if (isNaN(n) || n < 1 || n > rules.maxTotal) {
          return new Response(
            JSON.stringify({ error: `Número de parcelas inválido. Permitido: 1 a ${rules.maxTotal}.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (n > 1) {
          const { installmentValue, totalValue } = calcInstallment(roundedAmount, n, rules);
          paymentBody.installmentCount = n;
          paymentBody.installmentValue = installmentValue;
          paymentBody.totalValue = totalValue;
          delete paymentBody.value;
          safeLog('[Asaas] Installments', { n, installmentValue, totalValue, rules });
        }
      }


    }

    const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentBody),
    });

    if (!paymentRes.ok) {
      const errJson = await paymentRes.json().catch(() => ({}));
      const rawList: string[] = Array.isArray(errJson?.errors)
        ? errJson.errors.map((e: any) => `${e?.code || ''} ${e?.description || ''}`.trim())
        : [];
      const raw = [errJson?.refusalReason, ...rawList].filter(Boolean).join(' | ');
      console.error('[Asaas] Payment error status:', paymentRes.status, 'code:', errJson?.errors?.[0]?.code);

      const mapped = mapRefusal(raw);
      await logOrderEvent(supabase, orderId, 'payment_refused', mapped.message, raw, {
        http_status: paymentRes.status,
        reason_code: mapped.code,
      });

      return new Response(
        JSON.stringify({ error: mapped.message, reasonCode: mapped.code, refusalReason: raw || null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const payment = await paymentRes.json();
    safeLog('[Asaas] Payment created', { id: payment.id, status: payment.status });

    // Cartão recusado mesmo com HTTP 200
    if (isCard && ['REFUSED', 'DECLINED', 'REFUNDED', 'CHARGEBACK_REQUESTED'].includes(String(payment.status))) {
      const raw = [payment.refusalReason, payment.creditCard?.refusalReason, payment.status]
        .filter(Boolean).join(' | ');
      const mapped = mapRefusal(raw);
      await logOrderEvent(supabase, orderId, 'payment_refused', mapped.message, raw, {
        payment_id: payment.id, asaas_status: payment.status, reason_code: mapped.code,
      });
      // Mantém o pedido aberto para nova tentativa
      await supabase.from('orders').update({ status: 'pending_payment' }).eq('id', orderId);
      return new Response(
        JSON.stringify({ error: mapped.message, reasonCode: mapped.code, refusalReason: raw || null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


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
