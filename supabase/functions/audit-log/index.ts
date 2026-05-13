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

    // SECURITY: Verify authentication token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[audit-log] Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('[audit-log] Auth error:', authError?.message || 'User not found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const logData: AuditLogRequest = await req.json()

    // SECURITY: Validate that the userId in the log matches the authenticated user
    // or that the user is an admin (for logging actions on behalf of others)
    if (logData.userId !== user.id) {
      // Check if user is admin
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (!userRole || userRole.role !== 'admin') {
        console.error('[audit-log] Attempt to log for different user without admin privileges')
        return new Response(
          JSON.stringify({ error: 'Forbidden - Cannot log for other users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

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
    
    return new Response(
      JSON.stringify({ error: 'Failed to create audit log' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
