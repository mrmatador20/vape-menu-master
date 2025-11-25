import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuditLogRequest {
  userId: string
  activityType: string
  ipAddress?: string
  userAgent?: string
  deviceFingerprint?: string
  metadata?: any
  beforeData?: any
  afterData?: any
  resourceType?: string
  resourceId?: string
  severity?: 'info' | 'warning' | 'critical'
  sessionId?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const logData: AuditLogRequest = await req.json()

    console.log('Creating audit log entry:', {
      userId: logData.userId,
      activityType: logData.activityType,
      severity: logData.severity || 'info',
    })

    // Insert audit log using service role to bypass RLS
    const { data, error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: logData.userId,
        activity_type: logData.activityType,
        ip_address: logData.ipAddress || null,
        user_agent: logData.userAgent || null,
        device_fingerprint: logData.deviceFingerprint || null,
        metadata: logData.metadata || {},
        before_data: logData.beforeData || null,
        after_data: logData.afterData || null,
        resource_type: logData.resourceType || null,
        resource_id: logData.resourceId || null,
        severity: logData.severity || 'info',
        session_id: logData.sessionId || null,
      })
      .select()

    if (error) {
      console.error('Error creating audit log:', error)
      throw error
    }

    console.log('Audit log created successfully:', data)

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Audit log error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create audit log'
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
