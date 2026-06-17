import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escHtml = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');


interface NotifyDeliveryReviewRequest {
  orderId: string;
  userId: string;
  userName?: string;
  orderItems: Array<{
    name: string;
    quantity: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[notify-delivery-review] Request received");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // SECURITY: Verify authentication token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[notify-delivery-review] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("[notify-delivery-review] Auth error:", authError?.message || "User not found");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { orderId, userId, userName, orderItems }: NotifyDeliveryReviewRequest = await req.json();

    console.log("[notify-delivery-review] Processing for order:", orderId);

    if (!orderId || !userId) {
      console.error("[notify-delivery-review] Missing required fields");
      return new Response(
        JSON.stringify({ error: "orderId and userId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SECURITY: Verify caller has permission (must be the user themselves OR an admin)
    const isOwnOrder = user.id === userId;
    
    if (!isOwnOrder) {
      // Check if caller is admin
      const { data: userRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!userRole || userRole.role !== 'admin') {
        console.error("[notify-delivery-review] Unauthorized: User is not owner or admin");
        return new Response(
          JSON.stringify({ error: "Forbidden - Not authorized to trigger this notification" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // SECURITY: Verify the order belongs to the target userId
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('user_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error("[notify-delivery-review] Order not found");
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (order.user_id !== userId) {
      console.error("[notify-delivery-review] Order does not belong to specified user");
      return new Response(
        JSON.stringify({ error: "Forbidden - Order user mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Buscar email do usuário via auth.users (usando service role)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user?.email) {
      console.error("[notify-delivery-review] Error fetching user email");
      return new Response(
        JSON.stringify({ error: "Could not fetch user email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userEmail = userData.user.email;
    console.log("[notify-delivery-review] Sending notification email");

    // Generate product list HTML
    const productsHtml = orderItems
      .map(item => `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">${escHtml(item.name)} (x${escHtml(item.quantity)})</li>`)
      .join("");

    // Build email HTML with branded template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Roboto', 'Open Sans', Arial, sans-serif; background-color: #0f1419;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #00ccff 0%, #00d9a3 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #0f1419; margin: 0; font-size: 28px; font-weight: bold;">
              Vape Menu Express
            </h1>
            <p style="color: #0f1419; margin: 10px 0 0 0; opacity: 0.8;">
              Seu pedido foi entregue!
            </p>
          </div>

          <!-- Content -->
          <div style="background-color: #1a1f26; padding: 30px; border-radius: 0 0 12px 12px;">
            <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 20px;">
              Olá${userName ? `, ${userName}` : ''}! 👋
            </h2>
            
            <p style="color: #9ca3af; line-height: 1.6; margin: 0 0 20px 0;">
              Esperamos que você tenha gostado dos seus produtos! Sua opinião é muito importante para nós e ajuda outros clientes a fazerem melhores escolhas.
            </p>

            <div style="background-color: #2a303a; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #00ccff; margin: 0 0 15px 0; font-size: 16px;">
                📦 Produtos do seu pedido:
              </h3>
              <ul style="color: #ffffff; margin: 0; padding: 0 0 0 20px; list-style: none;">
                ${productsHtml}
              </ul>
            </div>

            <p style="color: #9ca3af; line-height: 1.6; margin: 20px 0;">
              Acesse sua conta e avalie os produtos que você recebeu. Sua avaliação com estrelas e comentários ajuda nossa comunidade!
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'lovable.app')}/my-orders" 
                 style="background: linear-gradient(135deg, #00ccff 0%, #00d9a3 100%); color: #0f1419; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                ⭐ Avaliar Meus Produtos
              </a>
            </div>

            <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 30px 0 0 0;">
              Pedido #${orderId.slice(0, 8)}
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Vape Menu Express. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Vape Menu Express <onboarding@resend.dev>",
        to: [userEmail],
        subject: "⭐ Avalie seu pedido - Vape Menu Express",
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("[notify-delivery-review] Email error");
      throw new Error("Failed to send email");
    }

    console.log("[notify-delivery-review] Email sent successfully");

    // Log notification
    await supabaseAdmin.from("security_notification_logs").insert({
      user_id: userId,
      notification_type: "delivery_review_request",
      channel: "email",
      recipient: userEmail,
      subject: "Avalie seu pedido",
      message_content: `Solicitação de avaliação enviada para pedido ${orderId.slice(0, 8)}`,
      status: "sent",
      delivered_at: new Date().toISOString(),
      metadata: { orderId: orderId.slice(0, 8), itemCount: orderItems.length },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[notify-delivery-review] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
