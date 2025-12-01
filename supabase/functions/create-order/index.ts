import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema for input sanitization
const orderRequestSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
    flavor: z.string().trim().max(50).optional(),
    price: z.number().nonnegative().optional(), // ✅ Aceitar preço do frontend
  })).min(1),
  address: z.object({
    street: z.string().trim().min(1).max(100),
    number: z.string().trim().min(1).max(20),
    neighborhood: z.string().trim().min(1).max(100),
    city: z.string().trim().min(1).max(100),
  }),
  cep: z.string().trim().min(8).max(8),
  shippingCost: z.number().min(0),
  paymentMethod: z.enum(['pix', 'dinheiro']),
  changeAmount: z.string().trim().optional(),
  discountCode: z.string().trim().max(50).optional(),
  referralCode: z.string().trim().max(8).optional(),
});

interface OrderItem {
  id: string;
  quantity: number;
  flavor?: string;
  price?: number; // ✅ Aceitar preço do frontend
}

interface Product {
  id: string;
  price: number;
  name: string;
  stock: number;
  discount_value?: number;
  discount_type?: string;
}

interface Flavor {
  id: string;
  product_id: string;
  name: string;
  stock: number;
}

interface OrderRequest {
  items: OrderItem[];
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
  };
  cep: string;
  shippingCost: number;
  paymentMethod: string;
  changeAmount?: string;
  discountCode?: string;
}

serve(async (req) => {
  console.log('[create-order] Function invoked');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      console.error('[create-order] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('[create-order] Auth error:', authError?.message || 'User not found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[create-order] User authenticated:', user.id);

    // Advanced Rate Limiting System
    const ACTION_TYPE = 'order_create';
    const RATE_LIMIT_WINDOW = 60; // 1 minute
    const MAX_ATTEMPTS = 3; // Max 3 orders per minute
    const BLOCK_DURATION = 15 * 60; // 15 minutes block

    // Get client IP for additional tracking
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Check if user is blocked
    const { data: existingLimit, error: fetchError } = await supabaseClient
      .from('rate_limit_tracking')
      .select('*')
      .eq('identifier', user.id)
      .eq('action_type', ACTION_TYPE)
      .maybeSingle();

    if (fetchError) {
      console.error('[create-order] Rate limit fetch error:', fetchError);
    }

    // Check if blocked
    if (existingLimit?.is_blocked) {
      if (existingLimit.block_expires_at && new Date(existingLimit.block_expires_at) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(existingLimit.block_expires_at).getTime() - Date.now()) / 60000);
        console.log(`[create-order] User ${user.id} is blocked for ${remainingMinutes} more minutes`);
        return new Response(
          JSON.stringify({ 
            error: `Conta temporariamente bloqueada devido a muitas tentativas. Tente novamente em ${remainingMinutes} minutos.` 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Block expired, reset it
        await supabaseClient
          .from('rate_limit_tracking')
          .update({ 
            is_blocked: false, 
            block_expires_at: null,
            attempt_count: 0,
            window_start: new Date().toISOString()
          })
          .eq('id', existingLimit.id);
      }
    }

    // Check rate limit window
    if (existingLimit && !existingLimit.is_blocked) {
      const windowStart = new Date(existingLimit.window_start);
      const now = new Date();
      const windowElapsed = (now.getTime() - windowStart.getTime()) / 1000;

      if (windowElapsed < RATE_LIMIT_WINDOW) {
        // Still in the same window
        if (existingLimit.attempt_count >= MAX_ATTEMPTS) {
          // Block the user
          await supabaseClient
            .from('rate_limit_tracking')
            .update({ 
              is_blocked: true, 
              block_expires_at: new Date(Date.now() + BLOCK_DURATION * 1000).toISOString(),
              attempt_count: existingLimit.attempt_count + 1
            })
            .eq('id', existingLimit.id);

          console.log(`[create-order] User ${user.id} blocked for exceeding rate limit`);
          return new Response(
            JSON.stringify({ 
              error: 'Muitas tentativas de pedido. Sua conta foi bloqueada por 15 minutos para segurança.' 
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Increment attempt count
          await supabaseClient
            .from('rate_limit_tracking')
            .update({ 
              attempt_count: existingLimit.attempt_count + 1 
            })
            .eq('id', existingLimit.id);
        }
      } else {
        // Window expired, reset counter
        await supabaseClient
          .from('rate_limit_tracking')
          .update({ 
            attempt_count: 1,
            window_start: new Date().toISOString()
          })
          .eq('id', existingLimit.id);
      }
    } else if (!existingLimit) {
      // First attempt, create new tracking record
      await supabaseClient
        .from('rate_limit_tracking')
        .insert({
          identifier: user.id,
          action_type: ACTION_TYPE,
          attempt_count: 1,
          window_start: new Date().toISOString(),
          is_blocked: false
        });
    }

    console.log(`[create-order] Rate limit check passed for user ${user.id}`);

    // Parse and validate request body
    const rawData = await req.json();
    console.log('[create-order] Request data received:', JSON.stringify(rawData).substring(0, 200));
    
    let orderData: OrderRequest;
    try {
      orderData = orderRequestSchema.parse(rawData);
      console.log('[create-order] Data validation successful');
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[create-order] Validation error:', error.errors);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request data', 
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    // Fetch current product prices and flavors from database
    const productIds = orderData.items.map(item => item.id);
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, price, name, stock, discount_value, discount_type')
      .in('id', productIds);

    if (productsError || !products) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch product information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all flavors for products that have them
    const { data: flavors, error: flavorsError } = await supabaseClient
      .from('flavors')
      .select('id, product_id, name, stock')
      .in('product_id', productIds);

    if (flavorsError) {
      console.error('Error fetching flavors:', flavorsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch flavor information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create maps for easy lookup
    const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
    const flavorsByProduct = new Map<string, Flavor[]>();
    if (flavors) {
      flavors.forEach((flavor: Flavor) => {
        if (!flavorsByProduct.has(flavor.product_id)) {
          flavorsByProduct.set(flavor.product_id, []);
        }
        flavorsByProduct.get(flavor.product_id)!.push(flavor);
      });
    }

    // Verify all products exist and calculate server-side total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of orderData.items) {
      const product = productMap.get(item.id);
      
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Product ${item.id} not found` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check stock availability based on whether the product has flavors
      const productFlavors = flavorsByProduct.get(item.id) || [];
      let stockToCheck = product.stock;
      let stockSource = 'product';

      // If item has a flavor, check flavor stock instead
      if (item.flavor && productFlavors.length > 0) {
        const selectedFlavor = productFlavors.find((f: Flavor) => f.name === item.flavor);
        
        if (!selectedFlavor) {
          return new Response(
            JSON.stringify({ error: `Flavor "${item.flavor}" not found for ${product.name}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        stockToCheck = selectedFlavor.stock;
        stockSource = 'flavor';
      }

      if (stockToCheck < item.quantity) {
        return new Response(
          JSON.stringify({ 
            error: `Insufficient stock for ${product.name}${item.flavor ? ` (${item.flavor})` : ''}. Available: ${stockToCheck}, Requested: ${item.quantity}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (item.quantity <= 0 || item.quantity > 100) {
        return new Response(
          JSON.stringify({ error: 'Invalid quantity' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ✅ Usar preço do frontend se disponível (já com desconto aplicado)
      // Caso contrário, calcular no servidor (fallback para compatibilidade)
      let finalPrice: number;
      
      if (item.price !== undefined && item.price !== null) {
        // Usar preço enviado pelo frontend (já com desconto do produto base aplicado)
        finalPrice = Number(item.price);
        console.log(`[create-order] Using frontend price for ${product.name}: ${finalPrice}`);
      } else {
        // Fallback: calcular preço no servidor (para compatibilidade com clientes antigos)
        finalPrice = Number(product.price);
        if (product.discount_value && product.discount_value > 0) {
          if (product.discount_type === 'percent') {
            finalPrice = finalPrice * (1 - product.discount_value / 100);
          } else if (product.discount_type === 'fixed') {
            finalPrice = Math.max(0, finalPrice - product.discount_value);
          }
        }
        console.log(`[create-order] Calculated server price for ${product.name}: ${finalPrice}`);
      }

      const itemTotal = finalPrice * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product_id: item.id,
        quantity: item.quantity,
        price: finalPrice, // Save discounted price
        name: product.name,
        flavor: item.flavor,
        stockSource, // Track whether to update product or flavor stock
      });
    }

    console.log('Server-calculated total:', totalAmount);

    // Apply discount if code is provided
    let discountAmount = 0;
    let discountId: string | null = null;

    if (orderData.discountCode) {
      console.log('[create-order] Validating discount code:', orderData.discountCode);
      // Use secure RPC function to validate discount code (prevents enumeration)
      const { data: discounts, error: discountError } = await supabaseClient
        .rpc('validate_discount_code', { code_input: orderData.discountCode });

      if (discountError || !discounts || discounts.length === 0) {
        console.error('[create-order] Discount validation failed:', discountError);
        return new Response(
          JSON.stringify({ error: 'Código de desconto inválido ou expirado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('[create-order] Discount code validated successfully');

      const discount = discounts[0];

      // Check if discount is valid
      if (discount.valid_until && new Date(discount.valid_until) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Discount code expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check usage limit
      if (discount.max_uses) {
        const { count, error: countError } = await supabaseClient
          .from('discount_usage')
          .select('*', { count: 'exact', head: true })
          .eq('discount_id', discount.id);

        if (countError) {
          console.error('Error checking discount usage:', countError);
          return new Response(
            JSON.stringify({ error: 'Falha ao validar cupom de desconto' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (count && count >= discount.max_uses) {
          return new Response(
            JSON.stringify({ error: `Cupom atingiu o limite de ${discount.max_uses} usos` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Check if user already used this discount
      const { data: existingUsage, error: usageError } = await supabaseClient
        .from('discount_usage')
        .select('id')
        .eq('discount_id', discount.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (usageError) {
        console.error('Error checking user discount usage:', usageError);
        return new Response(
          JSON.stringify({ error: 'Falha ao validar cupom de desconto' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingUsage) {
        return new Response(
          JSON.stringify({ error: 'Você já utilizou este cupom anteriormente' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Apply discount
      if (discount.type === 'percent') {
        discountAmount = (totalAmount * discount.value) / 100;
      } else {
        discountAmount = discount.value;
      }

      discountId = discount.id;
    }

    // Buscar configuração de frete grátis
    console.log('[create-order] Fetching free shipping settings...');
    const { data: freeShippingSettings, error: settingsError } = await supabaseClient
      .from('settings')
      .select('value')
      .eq('key', 'free_shipping_min_value')
      .maybeSingle();

    if (settingsError) {
      console.error('[create-order] Error fetching free shipping settings:', settingsError);
    } else {
      console.log('[create-order] Free shipping settings retrieved');
    }

    const freeShippingMinValue = freeShippingSettings ? parseFloat(freeShippingSettings.value) : 0;
    const subtotal = totalAmount - discountAmount;
    
    // Aplicar frete grátis se o subtotal qualificar
    const qualifiesForFreeShipping = freeShippingMinValue > 0 && subtotal >= freeShippingMinValue;
    const finalShippingCost = qualifiesForFreeShipping ? 0 : orderData.shippingCost;
    
    const finalAmount = subtotal + finalShippingCost;

    console.log('[create-order] Creating order in database with total:', finalAmount);
    // Create the order with server-side validated data
    // PIX orders start as pending_payment, others as pending
    const initialStatus = orderData.paymentMethod === 'pix' ? 'pending_payment' : 'pending';
    
    // PIX QR codes expire after 30 minutes
    const expiresAt = orderData.paymentMethod === 'pix' 
      ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
      : null;
    
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        payment_method: orderData.paymentMethod,
        change_amount: orderData.changeAmount ? parseFloat(orderData.changeAmount) : null,
        address_street: orderData.address.street,
        address_number: orderData.address.number,
        address_neighborhood: orderData.address.neighborhood,
        address_city: orderData.address.city,
        cep: orderData.cep,
        shipping_cost: finalShippingCost,
        total_amount: finalAmount,
        status: initialStatus,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (orderError) {
      console.error('[create-order] Error creating order:', JSON.stringify(orderError));
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao criar pedido. Por favor, tente novamente.',
          details: orderError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-order] Order inserted successfully, ID:', order.id);

    // Create order items
    console.log('[create-order] Creating order items...');
    const orderItems = validatedItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      flavor: item.flavor,
    }));

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('[create-order] Error creating order items:', JSON.stringify(itemsError));
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao criar itens do pedido',
          details: itemsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-order] Order items inserted successfully');

    // Process referral if code provided
    if (sanitizedInput.referralCode) {
      try {
        const referralResponse = await supabaseClient.functions.invoke('process-referral', {
          body: { orderId: order.id, referralCode: sanitizedInput.referralCode }
        });
        if (referralResponse.data?.success) {
          console.log('[create-order] Referral processed:', referralResponse.data);
        }
      } catch (e) {
        console.error('[create-order] Referral error (non-blocking):', e);
      }
    }

    // Stock will be decremented automatically by the database trigger
    // when the order status is changed to 'confirmed' or 'delivered'

    // Track discount usage if discount was applied
    if (discountId) {
      const { error: usageError } = await supabaseClient
        .from('discount_usage')
        .insert({
          discount_id: discountId,
          user_id: user.id,
          order_id: order.id,
        });

      if (usageError) {
        console.error('Error tracking discount usage:', usageError);
        // Don't fail the order if tracking fails, just log it
      }
    }

    // Return the validated items with names for WhatsApp message
    console.log('[create-order] Order created successfully:', order.id);
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          total: finalAmount,
          items: validatedItems,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-order] Unhandled error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
