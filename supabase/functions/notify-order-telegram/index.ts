import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

const brl = (v: unknown) =>
  `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Autorização: chamada interna (service role) OU admin autenticado
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    let authorized = !!token && token === SERVICE_ROLE_KEY;

    if (!authorized && token) {
      const { data: userData } = await admin.auth.getUser(token);
      const uid = userData?.user?.id;
      if (uid) {
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
        authorized = (roles ?? []).some((r: { role: string }) =>
          ["admin", "super_admin"].includes(r.role)
        );
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const isTest = body?.test === true;

    // Credenciais protegidas em system_secrets (somente backend/admin)
    const { data: secrets, error: secretsError } = await admin
      .from("system_secrets")
      .select("key, value")
      .in("key", ["telegram_bot_token", "telegram_chat_id"]);

    if (secretsError) {
      console.error("[notify-order-telegram] secrets error:", secretsError.message);
      return new Response(JSON.stringify({ error: "Falha ao ler configurações" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const map = Object.fromEntries((secrets ?? []).map((s: any) => [s.key, s.value]));
    const botToken = (map.telegram_bot_token ?? "").trim();
    const chatId = (map.telegram_chat_id ?? "").trim();

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({ error: "Telegram não configurado. Informe o token do bot e o ID do chat." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let text: string;

    if (isTest) {
      text =
        `🧪 <b>Teste de notificação</b>\n\n` +
        `🛒 <b>Nova venda confirmada</b>\n` +
        `Pedido: <code>TESTE-0001</code>\n` +
        `Cliente: Cliente Fictício\n` +
        `Pagamento: PIX\n` +
        `Total: <b>${brl(199.9)}</b>\n\n` +
        `Se você recebeu esta mensagem, a integração está funcionando. ✅`;
    } else {
      const orderId: string | undefined = body?.orderId;
      let order: any = body?.order ?? null;

      if (!order && orderId) {
        const { data } = await admin
          .from("orders")
          .select("id, total_amount, payment_method, status, customer_name, address_city, address_state, created_at")
          .eq("id", orderId)
          .maybeSingle();
        order = data;
      }

      if (!order) {
        return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      text =
        `🛒 <b>Nova venda confirmada</b>\n\n` +
        `Pedido: <code>${String(order.id).slice(0, 8).toUpperCase()}</code>\n` +
        (order.customer_name ? `Cliente: ${order.customer_name}\n` : "") +
        `Pagamento: ${order.payment_method ?? "-"}\n` +
        (order.address_city ? `Local: ${order.address_city}${order.address_state ? "/" + order.address_state : ""}\n` : "") +
        `Total: <b>${brl(order.total_amount)}</b>`;
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.ok === false) {
      console.error(`[notify-order-telegram] telegram error [${response.status}]:`, JSON.stringify(result));
      return new Response(
        JSON.stringify({
          error: "Falha ao enviar mensagem no Telegram",
          details: result?.description ?? `HTTP ${response.status}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, message_id: result?.result?.message_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[notify-order-telegram] unexpected error:", e);
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
