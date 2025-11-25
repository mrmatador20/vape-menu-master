import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Anomaly {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  details: any
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // SECURITY: Verify authentication and admin role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[detect-anomalies] Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('[detect-anomalies] Auth error:', authError?.message || 'User not found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (!userRole || userRole.role !== 'admin') {
      console.error('[detect-anomalies] Non-admin user attempted access')
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { loginLogs, criticalActions, blockedIPs } = await req.json()
    const anomalies: Anomaly[] = []
    const now = new Date()

    // Detect multiple failed logins from same IP
    const ipFailures: Record<string, number> = {}
    loginLogs?.forEach((log: any) => {
      if (log.activity_type === 'login_failed' && log.ip_address) {
        ipFailures[log.ip_address] = (ipFailures[log.ip_address] || 0) + 1
      }
    })

    Object.entries(ipFailures).forEach(([ip, count]) => {
      if (count >= 5) {
        anomalies.push({
          type: 'brute_force_attempt',
          description: `${count} tentativas de login falhas do IP ${ip}`,
          severity: count >= 10 ? 'critical' : 'high',
          timestamp: now.toISOString(),
          details: { ip, count, action: 'login_failed' }
        })
      }
    })

    // Detect multiple failed logins from same user
    const userFailures: Record<string, number> = {}
    loginLogs?.forEach((log: any) => {
      if (log.activity_type === 'login_failed') {
        userFailures[log.user_id] = (userFailures[log.user_id] || 0) + 1
      }
    })

    Object.entries(userFailures).forEach(([userId, count]) => {
      if (count >= 3) {
        anomalies.push({
          type: 'account_compromise_attempt',
          description: `${count} tentativas de login falhas para o mesmo usuário`,
          severity: count >= 5 ? 'critical' : 'high',
          timestamp: now.toISOString(),
          details: { userId, count }
        })
      }
    })

    // Detect unusual time patterns (logins outside 6am-11pm)
    const unusualTimeLogins = loginLogs?.filter((log: any) => {
      const hour = new Date(log.created_at).getHours()
      return hour < 6 || hour > 23
    })

    if (unusualTimeLogins?.length >= 3) {
      anomalies.push({
        type: 'unusual_access_time',
        description: `${unusualTimeLogins.length} acessos fora do horário comercial`,
        severity: 'medium',
        timestamp: now.toISOString(),
        details: { count: unusualTimeLogins.length }
      })
    }

    // Detect multiple critical actions from same user in short time
    const recentCritical = criticalActions?.filter((action: any) => {
      const actionTime = new Date(action.created_at)
      const timeDiff = now.getTime() - actionTime.getTime()
      return timeDiff < 60 * 60 * 1000 // Last hour
    })

    const criticalByUser: Record<string, number> = {}
    recentCritical?.forEach((action: any) => {
      criticalByUser[action.user_id] = (criticalByUser[action.user_id] || 0) + 1
    })

    Object.entries(criticalByUser).forEach(([userId, count]) => {
      if (count >= 3) {
        anomalies.push({
          type: 'suspicious_activity_burst',
          description: `${count} ações críticas em curto período pelo mesmo usuário`,
          severity: 'high',
          timestamp: now.toISOString(),
          details: { userId, count, timeframe: '1 hour' }
        })
      }
    })

    // Detect high number of blocked IPs
    if (blockedIPs?.length >= 10) {
      anomalies.push({
        type: 'ddos_pattern',
        description: `${blockedIPs.length} IPs bloqueados - possível ataque DDoS`,
        severity: 'critical',
        timestamp: now.toISOString(),
        details: { blockedCount: blockedIPs.length }
      })
    }

    // Detect password changes after failed logins (possible compromise)
    const passwordChanges = criticalActions?.filter((a: any) => 
      a.activity_type === 'password_changed'
    )

    passwordChanges?.forEach((change: any) => {
      const recentFailures = loginLogs?.filter((log: any) => 
        log.user_id === change.user_id &&
        log.activity_type === 'login_failed' &&
        new Date(log.created_at) < new Date(change.created_at) &&
        new Date(change.created_at).getTime() - new Date(log.created_at).getTime() < 60 * 60 * 1000
      )

      if (recentFailures?.length >= 2) {
        anomalies.push({
          type: 'post_compromise_recovery',
          description: 'Mudança de senha após tentativas de login falhas',
          severity: 'high',
          timestamp: change.created_at,
          details: { userId: change.user_id, failedAttempts: recentFailures.length }
        })
      }
    })

    console.log(`Detected ${anomalies.length} anomalies`)

    return new Response(
      JSON.stringify({ anomalies }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Anomaly detection error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
