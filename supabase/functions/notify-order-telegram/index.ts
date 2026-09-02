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
      const orderId: string | undefined = body?.orderId ?? body?.order?.id;

      if (!orderId) {
        return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order } = await admin
        .from("orders")
        .select(
          "id, user_id, total_amount, shipping_cost, payment_method, status, customer_name, customer_phone, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, cep, created_at",
        )
        .eq("id", orderId)
        .maybeSingle();

      if (!order) {
        return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Itens do pedido + produtos
      const { data: items } = await admin
        .from("order_items")
        .select("quantity, price, flavor, product_id, products(name)")
        .eq("order_id", orderId);

      const productIds = [...new Set((items ?? []).map((i: any) => i.product_id).filter(Boolean))];
      let flavors: any[] = [];
      if (productIds.length > 0) {
        const { data } = await admin
          .from("flavors")
          .select("product_id, name, color, size")
          .in("product_id", productIds);
        flavors = data ?? [];
      }

      // E-mail do cliente
      let customerEmail = "N/A";
      if (order.user_id) {
        const { data: userRes } = await admin.auth.admin.getUserById(order.user_id);
        customerEmail = userRes?.user?.email ?? "N/A";
      }

      // Perfil (telefone alternativo)
      let profilePhone: string | null = null;
      if (order.user_id) {
        const { data: profile } = await admin
          .from("profiles")
          .select("phone, full_name")
          .eq("id", order.user_id)
          .maybeSingle();
        profilePhone = profile?.phone ?? null;
        if (!order.customer_name && profile?.full_name) order.customer_name = profile.full_name;
      }

      const paymentLabels: Record<string, string> = {
        pix: "PIX",
        credit: "Cartão de Crédito",
        debit: "Cartão de Débito",
        dinheiro: "Dinheiro na entrega",
        balcao: "Balcão (PDV)",
        pix_balcao: "PIX Balcão",
      };
      const statusLabels: Record<string, string> = {
        pending_payment: "Aguardando pagamento",
        pending: "Pendente",
        confirmed: "Confirmado",
        preparing: "Em preparação",
        delivering: "Saiu para entrega",
        delivered: "Entregue",
        cancelled: "Cancelado",
      };

      const subtotal = (items ?? []).reduce(
        (sum: number, i: any) => sum + Number(i.price ?? 0) * Number(i.quantity ?? 0),
        0,
      );
      const shipping = Number(order.shipping_cost ?? 0);
      const total = Number(order.total_amount ?? 0);
      const discount = Math.max(0, subtotal + shipping - total);

      const itemLines = (items ?? []).map((i: any) => {
        const name = i.products?.name ?? "Produto";
        const variant = (i.flavor ?? "").trim();
        const match = flavors.find(
          (f) =>
            f.product_id === i.product_id &&
            (f.name === variant ||
              [f.color, f.size].filter(Boolean).join(" ") === variant ||
              [f.name, f.size].filter(Boolean).join(" ") === variant),
        );
        const cor = match?.color ?? (variant || null);
        const tamanho = match?.size ?? null;

        let line = `• <b>${i.quantity}x</b> ${name}\n`;
        if (cor || tamanho) {
          line += `  └ 🎨 <b>Cor:</b> ${cor ?? "N/A"} | 📐 <b>Tamanho:</b> ${tamanho ?? "N/A"}\n`;
        }
        line += `  └ 💰 <b>Valor un.:</b> ${brl(i.price)}`;
        return line;
      });

      const dataHora = new Date(order.created_at ?? Date.now()).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });
      const sep = "━━━━━━━━━━━━━━━━━━━";
      const complemento = order.address_complement ? `- ${order.address_complement}` : "";

      text =
        `🛍️ <b>NOVA VENDA REALIZADA! - FOX VELOUR</b>\n` +
        `${sep}\n` +
        `🆔 <b>Pedido:</b> <code>#${String(order.id).slice(0, 8).toUpperCase()}</code>\n` +
        `📅 <b>Data:</b> ${dataHora}\n\n` +
        `👤 <b>DADOS DO CLIENTE</b>\n` +
        `• <b>Nome:</b> ${order.customer_name ?? "N/A"}\n` +
        `• <b>E-mail:</b> ${customerEmail}\n` +
        `• <b>Telefone:</b> ${order.customer_phone ?? profilePhone ?? "N/A"}\n\n` +
        `📍 <b>ENDEREÇO DE ENTREGA</b>\n` +
        `• <b>Rua/Av:</b> ${order.address_street ?? "N/A"}, Nº ${order.address_number ?? "S/N"} ${complemento}\n` +
        `• <b>Bairro:</b> ${order.address_neighborhood ?? "N/A"}\n` +
        `• <b>Cidade/UF:</b> ${order.address_city ?? "N/A"}${order.address_state ? "/" + order.address_state : ""}\n` +
        `• <b>CEP:</b> ${order.cep ?? "N/A"}\n\n` +
        `📦 <b>ITENS DO PEDIDO</b>\n` +
        `${itemLines.length ? itemLines.join("\n") : "• Nenhum item registrado"}\n\n` +
        `💵 <b>RESUMO FINANCEIRO</b>\n` +
        `• <b>Subtotal:</b> ${brl(subtotal)}\n` +
        `• <b>Frete:</b> ${brl(shipping)} (${shipping > 0 ? "Entrega" : "Grátis"})\n` +
        `• <b>Desconto:</b> -${brl(discount)}\n` +
        `• 💰 <b>TOTAL PAGO:</b> <b>${brl(total)}</b>\n\n` +
        `💳 <b>PAGAMENTO</b>\n` +
        `• <b>Método:</b> ${paymentLabels[order.payment_method] ?? order.payment_method ?? "N/A"}\n` +
        `• 🚚 <b>Status:</b> ${statusLabels[order.status] ?? order.status ?? "N/A"}\n` +
        `${sep}`;
    }


    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.ok === false) {
      console.error(`[notify-order-telegram] telegram error [${response.status}]:`, JSON.stringify(result));
      const description: string = result?.description ?? `HTTP ${response.status}`;
      let hint = description;
      if (/chat not found/i.test(description)) {
        hint =
          "Chat não encontrado. Verifique o ID do chat e envie /start para o bot (ou adicione o bot ao grupo). Para grupos o ID começa com -100.";
      } else if (/bot was blocked|bot can't initiate/i.test(description)) {
        hint = "O bot não pode iniciar a conversa. Abra o chat com o bot e envie /start antes de testar.";
      } else if (/unauthorized/i.test(description)) {
        hint = "Token do bot inválido. Gere um novo token no @BotFather e salve novamente.";
      }
      return new Response(
        JSON.stringify({
          error: "Falha ao enviar mensagem no Telegram",
          details: hint,
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
