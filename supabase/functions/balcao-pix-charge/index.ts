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

const ASAAS_BASE_URL = 'https://api.asaas.com/v3'
const ALLOWED_ROLES = ['super_admin', 'admin', 'moderator', 'operador']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1) Autenticação
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim()
    if (!token) return json({ error: 'Não autorizado' }, 401)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return json({ error: 'Não autorizado' }, 401)

    // 2) Autorização por cargo de operador
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    const operatorRole = (roles ?? [])
      .map((r: { role: string }) => r.role)
      .find((r: string) => ALLOWED_ROLES.includes(r))
    if (!operatorRole) return json({ error: 'Permissão insuficiente para gerar Pix Balcão' }, 403)

    // 3) Validação de entrada
    const body = await req.json().catch(() => ({}))
    const amount = Number(body?.amount)
    if (!isFinite(amount) || amount <= 0 || amount > 100000) {
      return json({ error: 'Valor inválido' }, 400)
    }
    const roundedAmount = Math.round(amount * 100) / 100
    const description = String(body?.description ?? 'Venda Balcão').slice(0, 200)
    let cpfNumbers = String(body?.customerCpf ?? '').replace(/\D/g, '')
    let customerName = String(body?.customerName ?? '').trim().slice(0, 100)
    let usedFallback = false

    if (cpfNumbers.length !== 11 && cpfNumbers.length !== 14) {
      // Fallback: usa os dados do titular cadastrados em Sistema -> Configurações
      const { data: fallbackSettings } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['balcao_pix_fallback_cpf', 'balcao_pix_fallback_name'])

      const map = Object.fromEntries((fallbackSettings ?? []).map((s: { key: string; value: string }) => [s.key, s.value]))
      const fallbackCpf = String(map['balcao_pix_fallback_cpf'] ?? '').replace(/\D/g, '')
      if (fallbackCpf.length !== 11 && fallbackCpf.length !== 14) {
        return json({
          error: 'Informe o CPF/CNPJ do cliente ou cadastre o documento do titular em Sistema → Configurações',
        }, 400)
      }
      cpfNumbers = fallbackCpf
      customerName = String(map['balcao_pix_fallback_name'] ?? '').trim().slice(0, 100) || 'Cliente Balcão'
      usedFallback = true
    }

    customerName = customerName || 'Cliente Balcão'

    const apiKey = Deno.env.get('ASAAS_API_KEY')
    if (!apiKey) return json({ error: 'Pagamento indisponível' }, 503)

    const headers = {
      'Content-Type': 'application/json',
      access_token: apiKey,
      'User-Agent': 'FoxVelour/1.0',
    }

    // 4) Cria o pedido do balcão (fonte da verdade do valor)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        payment_method: 'pix_balcao',
        status: 'pending_payment',
        total_amount: roundedAmount,
        shipping_cost: 0,
        customer_name: customerName,
        address_street: 'Loja Física',
        address_number: 'S/N',
        address_neighborhood: 'Balcão',
        address_city: 'Balcão',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('[balcao-pix-charge] order insert error:', orderError?.message)
      return json({ error: 'Falha ao criar cobrança' }, 500)
    }

    // 5) Cliente Asaas
    const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: customerName,
        cpfCnpj: cpfNumbers,
        email: `balcao-${cpfNumbers}@foxvelour.com`,
        externalReference: order.id,
        notificationDisabled: true,
      }),
    })
    if (!customerRes.ok) {
      console.error('[balcao-pix-charge] customer error:', customerRes.status)
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
      return json({ error: 'CPF/CNPJ inválido ou erro ao criar cliente' }, 400)
    }
    const customer = await customerRes.json()

    // 6) Cobrança Pix
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)
    const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'PIX',
        value: roundedAmount,
        dueDate: dueDate.toISOString().split('T')[0],
        description,
        externalReference: order.id,
      }),
    })
    if (!paymentRes.ok) {
      console.error('[balcao-pix-charge] payment error:', paymentRes.status)
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
      return json({ error: 'Não foi possível gerar a cobrança Pix' }, 400)
    }
    const payment = await paymentRes.json()

    // 7) QR Code dinâmico
    const qrRes = await fetch(`${ASAAS_BASE_URL}/payments/${payment.id}/pixQrCode`, { headers })
    if (!qrRes.ok) {
      console.error('[balcao-pix-charge] qrcode error:', qrRes.status)
      return json({ error: 'Não foi possível gerar o QR Code' }, 400)
    }
    const qr = await qrRes.json()

    await supabase.from('order_logs').insert({
      order_id: order.id,
      event_type: 'pix_balcao_charge_created',
      message: 'Cobrança Pix Balcão gerada via Asaas',
      performed_by: user.id,
      metadata: {
        performed_by_role: operatorRole,
        payment_id: payment.id,
        amount: roundedAmount,
      },
    })

    return json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      qrCodeBase64: qr.encodedImage ?? null,
      qrCode: qr.payload ?? null,
      amount: roundedAmount,
    })
  } catch (e) {
    console.error('[balcao-pix-charge] unexpected error:', e)
    return json({ error: 'Erro interno' }, 500)
  }
})
