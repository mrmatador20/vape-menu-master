import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckDeviceRequest {
  deviceFingerprint: string;
  deviceName?: string;
  userAgent: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { deviceFingerprint, deviceName, userAgent }: CheckDeviceRequest = await req.json();

    // Get client IP address from request headers
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'Unknown';

    console.log('Checking device trust:', {
      userId: user.id,
      deviceFingerprint,
      clientIp,
    });

    // Check if device is already trusted
    const { data: existingDevice, error: deviceError } = await supabaseClient
      .from('trusted_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle();

    if (deviceError && deviceError.code !== 'PGRST116') {
      throw deviceError;
    }

    if (existingDevice) {
      // Device is trusted, update last used
      await supabaseClient
        .from('trusted_devices')
        .update({ 
          last_used_at: new Date().toISOString(),
          ip_address: clientIp,
        })
        .eq('id', existingDevice.id);

      console.log('Device is trusted, updated last_used_at');

      return new Response(
        JSON.stringify({
          isTrusted: true,
          isNewDevice: false,
          device: existingDevice,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      // New device detected
      console.log('New device detected, sending alert email');

      // Send new device alert email
      const { error: emailError } = await supabaseClient.functions.invoke('send-security-alert', {
        body: {
          alertType: 'new_device',
          email: user.email,
          details: {
            ipAddress: clientIp,
            userAgent,
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (emailError) {
        console.error('Failed to send new device alert email:', emailError);
      }

      // Add device to trusted devices
      const { data: newDevice, error: insertError } = await supabaseClient
        .from('trusted_devices')
        .insert({
          user_id: user.id,
          device_fingerprint: deviceFingerprint,
          device_name: deviceName || 'Unknown Device',
          user_agent: userAgent,
          ip_address: clientIp,
          is_trusted: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert new device:', insertError);
      }

      return new Response(
        JSON.stringify({
          isTrusted: true,
          isNewDevice: true,
          device: newDevice,
          alertSent: !emailError,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in check-device-trust function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
