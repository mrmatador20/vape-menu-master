import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, customerName, customerPhone, customerEmail, customerCpf, orderId } = await req.json();

    console.log('[create-pix-qrcode] Iniciando criação de QR code PIX');

    // Validação dos dados
    if (!amount || !customerName || !customerPhone || !customerEmail || !orderId) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos para gerar QR code PIX' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação do CPF se fornecido
    if (customerCpf && customerCpf.length !== 11) {
      return new Response(
        JSON.stringify({ error: 'CPF inválido. Deve conter 11 dígitos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ABACATEPAY_API_KEY = Deno.env.get('ABACATEPAY_API_KEY');
    if (!ABACATEPAY_API_KEY) {
      console.error('[create-pix-qrcode] ABACATEPAY_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração de pagamento indisponível' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chamar API da AbacatePay
    const abacatePayUrl = 'https://api.abacatepay.com/v1/pixQrCode/create';
    const abacatePayBody: any = {
      amount: Number(amount),
      expiresIn: 3600, // 1 hora de validade
      description: `Pedido ${orderId}`,
      customer: {
        name: customerName,
        cellphone: customerPhone,
        email: customerEmail,
      },
      metadata: {
        externalId: orderId
      }
    };

    // Adicionar CPF se fornecido
    if (customerCpf) {
      const formattedCpf = customerCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      abacatePayBody.customer.taxId = formattedCpf;
    }

    console.log('[create-pix-qrcode] Chamando API AbacatePay');

    const abacatePayResponse = await fetch(abacatePayUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(abacatePayBody),
    });

    if (!abacatePayResponse.ok) {
      const errorText = await abacatePayResponse.text();
      console.error('[create-pix-qrcode] Erro ao chamar AbacatePay:', abacatePayResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Falha ao gerar QR code PIX' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pixData = await abacatePayResponse.json();
    console.log('[create-pix-qrcode] QR code PIX criado com sucesso');

    return new Response(
      JSON.stringify({
        pixCode: pixData.pixCode,
        pixQrCodeUrl: pixData.pixQrCodeUrl,
        expiresAt: pixData.expiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-pix-qrcode] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar solicitação' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
