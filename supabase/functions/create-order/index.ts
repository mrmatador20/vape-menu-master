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
  })).min(1),
  address: z.object({
    street: z.string().trim().min(1).max(100),
    number: z.string().trim().min(1).max(20),
    neighborhood: z.string().trim().min(1).max(100),
    city: z.string().trim().min(1).max(100),
  }),
  paymentMethod: z.enum(['pix', 'dinheiro']),
  changeAmount: z.string().trim().optional(),
  discountCode: z.string().trim().max(50).optional(),
});

interface OrderItem {
  id: string;
  quantity: number;
  flavor?: string;
}

interface OrderRequest {
  items: OrderItem[];
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
  };
  paymentMethod: string;
  changeAmount?: string;
  discountCode?: string;  // Adicionando o código de desconto
}

serve(async (req) => {
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
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const rawData = await req.json();
    
    let orderData: OrderRequest;
    try {
      orderData = orderRequestSchema.parse(rawData);
    } catch (error) {
      if (error instanceof z.ZodError) {
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

    // Fetch current product prices from database
    const productIds = orderData.items.map(item => item.id);
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, price, name, stock')
      .in('id', productIds);

    if (productsError || !products) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch product information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a map of product prices
    const productMap = new Map(products.map(p => [p.id, p]));

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

      // Check stock availability
      if (product.stock < item.quantity) {
        return new Response(
          JSON.stringify({ 
            error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
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

      // Use server-side price, never trust client
      const itemTotal = Number(product.price) * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product_id: item.id,
        quantity: item.quantity,
        price: Number(product.price),
        name: product.name,
        flavor: item.flavor,
      });
    }

    console.log('Server-calculated total:', totalAmount);

    // Apply discount if code is provided
    let discountAmount = 0;
    let discountId: string | null = null;

    if (orderData.discountCode) {
      // Fetch discount from Supabase
      const { data: discount, error: discountError } = await supabaseClient
        .from('discounts')
        .select('id, value, type, valid_until, schedule_type, max_uses')
        .eq('code', orderData.discountCode)
        .eq('is_active', true)
        .single();

      if (discountError || !discount) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired discount code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
            JSON.stringify({ error: 'Failed to validate discount code' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (count && count >= discount.max_uses) {
          return new Response(
            JSON.stringify({ error: 'Discount code usage limit reached' }),
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
          JSON.stringify({ error: 'Failed to validate discount code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingUsage) {
        return new Response(
          JSON.stringify({ error: 'You have already used this discount code' }),
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

    const finalAmount = totalAmount - discountAmount;

    // Create the order with server-side validated data
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
        total_amount: finalAmount,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order items
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
      console.error('Error creating order items:', itemsError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrement stock for each product
    for (const item of orderData.items) {
      const product = productMap.get(item.id);
      const newStock = product!.stock - item.quantity;
      
      const { error: stockError } = await supabaseClient
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.id);

      if (stockError) {
        console.error('Error updating stock:', stockError);
        // Don't fail the order if stock update fails, just log it
      }
    }

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
    console.error('Error in create-order function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
