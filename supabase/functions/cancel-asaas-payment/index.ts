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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o pedido pertence ao usuário e está aguardando pagamento
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, user_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Pedido não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (order.status !== 'pending_payment') {
      return new Response(JSON.stringify({ error: 'Pedido não pode ser cancelado neste status' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ASAAS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Pagamento indisponível' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'NebulaVape/1.0',
    };

    // Buscar pagamento no Asaas por externalReference
    const findRes = await fetch(
      `${ASAAS_BASE_URL}/payments?externalReference=${encodeURIComponent(orderId)}`,
      { method: 'GET', headers }
    );

    let asaasDeleted = false;
    if (findRes.ok) {
      const list = await findRes.json();
      const payments = list?.data || [];
      for (const p of payments) {
        // Não tenta deletar pagamentos já confirmados/recebidos
        if (['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(p.status)) {
          console.warn('[Cancel Asaas] Payment already received, cannot cancel:', p.id);
          return new Response(JSON.stringify({ error: 'Pagamento já confirmado, não pode ser cancelado' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const delRes = await fetch(`${ASAAS_BASE_URL}/payments/${p.id}`, {
          method: 'DELETE',
          headers,
        });
        if (delRes.ok) {
          asaasDeleted = true;
          console.log('[Cancel Asaas] Payment deleted:', p.id);
        } else {
          console.error('[Cancel Asaas] Delete failed:', p.id, delRes.status);
        }
      }
    } else {
      console.warn('[Cancel Asaas] Find payments failed:', findRes.status);
    }

    // Atualizar pedido somente após sucesso (ou se não havia pagamento no Asaas)
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: 'Cancelado pelo cliente',
      })
      .eq('id', orderId);

    if (updateErr) {
      console.error('[Cancel Asaas] Update order error:', updateErr);
      return new Response(JSON.stringify({ error: 'Erro ao atualizar pedido' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, asaasDeleted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Cancel Asaas] Error:', error);
    return new Response(JSON.stringify({ error: 'Erro ao cancelar pedido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
