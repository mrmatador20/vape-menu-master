import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Autorização: chamada interna (service role) OU admin/moderator autenticado
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    let authorized = token === SERVICE_ROLE_KEY;

    if (!authorized && token) {
      const { data: userData } = await admin.auth.getUser(token);
      const uid = userData?.user?.id;
      if (uid) {
        const { data: roles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        authorized = (roles ?? []).some((r: { role: string }) =>
          ["admin", "super_admin", "moderator", "operador"].includes(r.role)
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
    const title = typeof body.title === "string" ? body.title.slice(0, 120) : "Novo pedido recebido!";
    const message = typeof body.body === "string" ? body.body.slice(0, 300) : "Um novo pedido acabou de entrar.";
    const url = typeof body.url === "string" ? body.url.slice(0, 300) : "/546498@18/orders";

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    // Destinatários: usuários com papel administrativo
    const { data: staff } = await admin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "super_admin", "moderator"]);

    const staffIds = [...new Set((staff ?? []).map((s: { user_id: string }) => s.user_id))];
    if (staffIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", staffIds);

    const payload = JSON.stringify({
      title,
      body: message,
      url,
      tag: "new-order",
      sound: "/sounds/order-alert.mp3",
      vibrate: [500, 110, 500, 110, 500],
      requireInteraction: true,
    });

    let sent = 0;
    const stale: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 86400, urgency: "high", headers: { Urgency: "high", Topic: "new-order" } },
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) stale.push(s.id);
          console.error("[send-order-notification] push failed", status);
        }
      }),
    );

    if (stale.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", stale);
    }

    return new Response(JSON.stringify({ sent, removed: stale.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[send-order-notification] error", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
