import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[process-referral] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[process-referral] Authentication failed');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { orderId, referralCode } = await req.json();

    console.log('[process-referral] Processing referral for order:', { orderId, referralCode });

    if (!orderId || !referralCode) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId or referralCode' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Find the user who owns the referral code
    const { data: referrerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, referral_code')
      .eq('referral_code', referralCode.toUpperCase())
      .maybeSingle();

    if (profileError) {
      console.error('[process-referral] Error finding referrer profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Database error finding referrer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!referrerProfile) {
      console.log('[process-referral] Referral code not found:', referralCode);
      return new Response(
        JSON.stringify({ success: false, message: 'Referral code not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, user_id, status, total_amount, referral_points_awarded, referred_by_code')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[process-referral] Error finding order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 2.1. Verify the authenticated user owns this order
    if (order.user_id !== user.id) {
      console.error('[process-referral] User does not own this order');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Order does not belong to user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 2.2. Order must be confirmed/delivered before awarding points
    if (!['confirmed', 'delivered'].includes(order.status)) {
      console.log('[process-referral] Order not yet confirmed, status:', order.status);
      return new Response(
        JSON.stringify({ success: false, message: 'Order must be confirmed before awarding points' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Check if user is referring themselves (not allowed)
    if (order.user_id === referrerProfile.id) {
      console.log('[process-referral] User cannot refer themselves');
      return new Response(
        JSON.stringify({ success: false, message: 'Cannot refer yourself' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check if points already awarded for this order
    if (order.referral_points_awarded) {
      console.log('[process-referral] Points already awarded for this order');
      return new Response(
        JSON.stringify({ success: false, message: 'Points already awarded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Get referral configuration from settings
    const { data: settingsData } = await supabaseClient
      .from('settings')
      .select('key, value')
      .in('key', ['referral_points_per_order', 'referral_min_order_value']);

    const pointsPerOrder = settingsData?.find(s => s.key === 'referral_points_per_order')?.value || '10';
    const minOrderValue = settingsData?.find(s => s.key === 'referral_min_order_value')?.value || '50';

    const POINTS_PER_REFERRAL = parseInt(pointsPerOrder);
    const MIN_ORDER_VALUE = parseFloat(minOrderValue);

    // Check if order meets minimum value requirement
    if (order.total_amount < MIN_ORDER_VALUE) {
      console.log('[process-referral] Order value below minimum:', { 
        orderValue: order.total_amount, 
        minRequired: MIN_ORDER_VALUE 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Pedido abaixo do valor mínimo (R$ ${MIN_ORDER_VALUE.toFixed(2)}) para ganhar pontos` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Get or create referrer's points record
    const { data: referrerPoints, error: pointsError } = await supabaseClient
      .from('referral_points')
      .select('points_balance, total_earned')
      .eq('user_id', referrerProfile.id)
      .maybeSingle();

    if (pointsError) {
      console.error('[process-referral] Error fetching referrer points:', pointsError);
      return new Response(
        JSON.stringify({ error: 'Database error fetching points' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 7. Update points balance
    const newBalance = (referrerPoints?.points_balance || 0) + POINTS_PER_REFERRAL;
    const newTotalEarned = (referrerPoints?.total_earned || 0) + POINTS_PER_REFERRAL;

    const { error: updateError } = await supabaseClient
      .from('referral_points')
      .upsert({
        user_id: referrerProfile.id,
        points_balance: newBalance,
        total_earned: newTotalEarned,
      }, {
        onConflict: 'user_id',
      });

    if (updateError) {
      console.error('[process-referral] Error updating points:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to award points' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 8. Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('referral_transactions')
      .insert({
        user_id: referrerProfile.id,
        transaction_type: 'earned',
        points_amount: POINTS_PER_REFERRAL,
        related_user_id: order.user_id,
        related_order_id: order.id,
        notes: `Indicação confirmada - Pedido #${order.id.substring(0, 8)}`,
      });

    if (transactionError) {
      console.error('[process-referral] Error creating transaction:', transactionError);
      // Continue even if transaction log fails
    }

    // 9. Mark order as points awarded
    const { error: markError } = await supabaseClient
      .from('orders')
      .update({ referral_points_awarded: true })
      .eq('id', orderId);

    if (markError) {
      console.error('[process-referral] Error marking order:', markError);
      // Continue even if marking fails
    }

    console.log('[process-referral] Successfully awarded points:', {
      referrer: referrerProfile.id,
      points: POINTS_PER_REFERRAL,
      newBalance,
    });

    return new Response(
      JSON.stringify({
        success: true,
        points_awarded: POINTS_PER_REFERRAL,
        new_balance: newBalance,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-referral] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});