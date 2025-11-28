import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, amount } = await req.json();

    if (!orderId || !amount) {
      return new Response(
        JSON.stringify({ error: 'orderId e amount são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ABACATEPAY_API_KEY = Deno.env.get('ABACATEPAY_API_KEY');
    if (!ABACATEPAY_API_KEY) {
      console.error('ABACATEPAY_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração de pagamento não disponível' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chamar API da AbacatePay para criar QR Code PIX
    const abacateResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        expiresIn: 900, // 15 minutos
        description: `Pedido #${orderId} - Vape-Menu-Express`,
        metadata: {
          externalId: orderId,
        }
      }),
    });

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text();
      console.error('Erro ao criar cobrança PIX:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar QR Code PIX' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const abacateData = await abacateResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        pixCode: abacateData.payload,
        pixQrCodeUrl: abacateData.imageUrl,
        expiresAt: abacateData.expiresAt,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro ao processar pagamento PIX:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar pagamento' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
