import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_ROLES = ['super_admin', 'admin', 'moderator']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1) Autenticação obrigatória
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return json({ error: 'Não autorizado' }, 401)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return json({ error: 'Não autorizado' }, 401)

    // 2) Autorização por cargo de operador
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const userRoles = (roles ?? []).map((r: { role: string }) => r.role)
    const operatorRole = userRoles.find((r) => ALLOWED_ROLES.includes(r))
    if (!operatorRole) {
      await supabase.from('security_events').insert({
        user_id: user.id,
        event_type: 'pix_balcao_unauthorized_confirmation',
        severity: 'critical',
        metadata: { reason: 'role_not_allowed' },
      })
      return json({ error: 'Permissão insuficiente para confirmar Pix Balcão' }, 403)
    }

    // 3) Validação de entrada
    const body = await req.json().catch(() => ({}))
    const orderId = String(body?.orderId ?? '')
    if (!UUID_RE.test(orderId)) return json({ error: 'orderId inválido' }, 400)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, payment_method, total_amount, user_id')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) return json({ error: 'Pedido não encontrado' }, 404)
    if (order.payment_method !== 'pix_balcao') {
      return json({ error: 'Pedido não é do tipo Pix Balcão' }, 400)
    }
    if (['confirmed', 'shipped', 'delivered'].includes(order.status)) {
      return json({ error: 'Pedido já confirmado' }, 409)
    }
    if (order.status === 'cancelled') {
      return json({ error: 'Pedido cancelado não pode ser confirmado' }, 409)
    }

    // 4) Confirmação (apenas service_role atravessa o trigger de proteção)
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', orderId)
      .eq('payment_method', 'pix_balcao')
      .in('status', ['pending', 'pending_payment', 'expired'])

    if (updateError) {
      console.error('[confirm-pix-balcao] update error:', updateError.message)
      return json({ error: 'Falha ao confirmar pagamento' }, 500)
    }

    // 5) Auditoria
    await supabase.from('order_logs').insert({
      order_id: orderId,
      event_type: 'pix_balcao_confirmed',
      message: 'Pagamento Pix Balcão confirmado manualmente pelo atendimento',
      performed_by: user.id,
      metadata: {
        performed_by: user.id,
        performed_by_role: operatorRole,
        previous_status: order.status,
        amount: order.total_amount,
        confirmed_at_utc: new Date().toISOString(),
      },
    })

    return json({ success: true, orderId, status: 'confirmed' })
  } catch (e) {
    console.error('[confirm-pix-balcao] unexpected error:', e)
    return json({ error: 'Erro interno' }, 500)
  }
})
