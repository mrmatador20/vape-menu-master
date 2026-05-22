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

interface GeoLocation {
  country?: string
  city?: string
  region?: string
}

// Simple IP geolocation lookup (in production, use a proper service)
async function getIPLocation(ip: string): Promise<GeoLocation | null> {
  try {
    // Skip private IPs
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.') || ip === '127.0.0.1' || ip === '::1') {
      return null
    }
    
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=country,city,regionName`)
    if (response.ok) {
      const data = await response.json()
      return {
        country: data.country,
        city: data.city,
        region: data.regionName
      }
    }
  } catch (error) {
    console.log(`[detect-anomalies] Could not get location for IP ${ip}`)
  }
  return null
}

// Calculate distance between two IP locations (simplified)
function isLocationSignificantlyDifferent(loc1: GeoLocation | null, loc2: GeoLocation | null): boolean {
  if (!loc1 || !loc2) return false
  // Different country is definitely suspicious
  if (loc1.country && loc2.country && loc1.country !== loc2.country) {
    return true
  }
  // Different region within same country could be suspicious
  if (loc1.region && loc2.region && loc1.region !== loc2.region) {
    return true
  }
  return false
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

    // ==========================================
    // IP-BASED ANOMALY DETECTION
    // ==========================================

    // 1. Detect multiple failed logins from same IP (Brute Force)
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

    // 2. Detect rapid location changes (Impossible Travel)
    const userLoginsByTime: Record<string, Array<{ ip: string; timestamp: Date; location?: GeoLocation }>> = {}
    
    for (const log of loginLogs || []) {
      if (log.activity_type === 'login' && log.ip_address) {
        if (!userLoginsByTime[log.user_id]) {
          userLoginsByTime[log.user_id] = []
        }
        userLoginsByTime[log.user_id].push({
          ip: log.ip_address,
          timestamp: new Date(log.created_at),
          location: undefined
        })
      }
    }

    // Check for impossible travel scenarios
    for (const [userId, logins] of Object.entries(userLoginsByTime)) {
      if (logins.length < 2) continue
      
      // Sort by timestamp
      logins.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      
      // Get unique IPs for this user
      const uniqueIPs = [...new Set(logins.map(l => l.ip))]
      
      // If user has multiple different IPs in last 24h, investigate further
      if (uniqueIPs.length >= 2) {
        // Get locations for unique IPs (limit API calls)
        const ipLocations: Record<string, GeoLocation | null> = {}
        for (const ip of uniqueIPs.slice(0, 3)) { // Limit to 3 IPs to avoid rate limits
          ipLocations[ip] = await getIPLocation(ip)
        }
        
        // Check for rapid location changes
        for (let i = 1; i < logins.length; i++) {
          const prev = logins[i - 1]
          const curr = logins[i]
          const timeDiffMinutes = (curr.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60)
          
          // If different IPs within 30 minutes
          if (prev.ip !== curr.ip && timeDiffMinutes < 30) {
            const loc1 = ipLocations[prev.ip]
            const loc2 = ipLocations[curr.ip]
            
            if (isLocationSignificantlyDifferent(loc1, loc2)) {
              anomalies.push({
                type: 'impossible_travel',
                description: `Login de localizações distantes em ${Math.round(timeDiffMinutes)} minutos`,
                severity: 'critical',
                timestamp: now.toISOString(),
                details: {
                  userId,
                  fromIP: prev.ip,
                  toIP: curr.ip,
                  fromLocation: loc1,
                  toLocation: loc2,
                  timeDiffMinutes: Math.round(timeDiffMinutes)
                }
              })
            }
          }
        }
        
        // Detect multiple countries in 24h (even if not impossible travel)
        const countries = new Set<string>()
        for (const ip of uniqueIPs) {
          if (ipLocations[ip]?.country) {
            countries.add(ipLocations[ip]!.country!)
          }
        }
        
        if (countries.size >= 2) {
          anomalies.push({
            type: 'multi_country_access',
            description: `Acessos de ${countries.size} países diferentes em 24h: ${Array.from(countries).join(', ')}`,
            severity: 'high',
            timestamp: now.toISOString(),
            details: { userId, countries: Array.from(countries), uniqueIPs }
          })
        }
      }
    }

    // 3. Detect multiple failed logins from same user
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

    // ==========================================
    // UNUSUAL ACCESS TIME DETECTION
    // ==========================================

    // 4. Enhanced unusual time patterns (detect per-user anomalies)
    const userAccessHours: Record<string, number[]> = {}
    
    loginLogs?.forEach((log: any) => {
      if (log.activity_type === 'login') {
        const hour = new Date(log.created_at).getHours()
        if (!userAccessHours[log.user_id]) {
          userAccessHours[log.user_id] = []
        }
        userAccessHours[log.user_id].push(hour)
      }
    })

    // Detect individual users accessing outside normal hours (2am-5am)
    Object.entries(userAccessHours).forEach(([userId, hours]) => {
      const lateNightHours = hours.filter(h => h >= 2 && h <= 5)
      if (lateNightHours.length >= 2) {
        anomalies.push({
          type: 'unusual_access_time_user',
          description: `Usuário com ${lateNightHours.length} acessos entre 2h-5h da manhã`,
          severity: 'medium',
          timestamp: now.toISOString(),
          details: { userId, lateNightAccessCount: lateNightHours.length, hours: lateNightHours }
        })
      }
    })

    // General unusual time logins (outside 6am-11pm)
    const unusualTimeLogins = loginLogs?.filter((log: any) => {
      const hour = new Date(log.created_at).getHours()
      return hour < 6 || hour > 23
    })

    if (unusualTimeLogins?.length >= 5) {
      anomalies.push({
        type: 'unusual_access_time_global',
        description: `${unusualTimeLogins.length} acessos fora do horário comercial (6h-23h)`,
        severity: unusualTimeLogins.length >= 10 ? 'high' : 'medium',
        timestamp: now.toISOString(),
        details: { count: unusualTimeLogins.length }
      })
    }

    // 5. Weekend/Holiday access patterns (more suspicious for business apps)
    const weekendLogins = loginLogs?.filter((log: any) => {
      const day = new Date(log.created_at).getDay()
      return day === 0 || day === 6 // Sunday or Saturday
    })

    if (weekendLogins?.length >= 5) {
      anomalies.push({
        type: 'weekend_access_pattern',
        description: `${weekendLogins.length} acessos durante fim de semana`,
        severity: 'low',
        timestamp: now.toISOString(),
        details: { count: weekendLogins.length }
      })
    }

    // ==========================================
    // ACTIVITY BURST DETECTION
    // ==========================================

    // 6. Detect multiple critical actions from same user in short time
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

    // 7. Detect rapid successive logins (potential credential stuffing)
    const ipLoginTimes: Record<string, Date[]> = {}
    loginLogs?.forEach((log: any) => {
      if (log.ip_address) {
        if (!ipLoginTimes[log.ip_address]) {
          ipLoginTimes[log.ip_address] = []
        }
        ipLoginTimes[log.ip_address].push(new Date(log.created_at))
      }
    })

    Object.entries(ipLoginTimes).forEach(([ip, times]) => {
      if (times.length >= 10) {
        times.sort((a, b) => a.getTime() - b.getTime())
        const firstTime = times[0]
        const lastTime = times[times.length - 1]
        const durationMinutes = (lastTime.getTime() - firstTime.getTime()) / (1000 * 60)
        
        // More than 10 logins in less than 10 minutes is suspicious
        if (durationMinutes < 10) {
          anomalies.push({
            type: 'credential_stuffing_pattern',
            description: `${times.length} tentativas de login do IP ${ip} em ${Math.round(durationMinutes)} minutos`,
            severity: 'critical',
            timestamp: now.toISOString(),
            details: { ip, loginCount: times.length, durationMinutes: Math.round(durationMinutes) }
          })
        }
      }
    })

    // ==========================================
    // DDOS & INFRASTRUCTURE ATTACKS
    // ==========================================

    // 8. Detect high number of blocked IPs (possible DDoS)
    if (blockedIPs?.length >= 10) {
      anomalies.push({
        type: 'ddos_pattern',
        description: `${blockedIPs.length} IPs bloqueados - possível ataque DDoS`,
        severity: 'critical',
        timestamp: now.toISOString(),
        details: { blockedCount: blockedIPs.length }
      })
    }

    // ==========================================
    // POST-COMPROMISE INDICATORS
    // ==========================================

    // 9. Detect password changes after failed logins (possible compromise)
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

    // 10. Detect account takeover pattern (successful login from new IP after failures)
    for (const [userId, logins] of Object.entries(userLoginsByTime)) {
      const failures = loginLogs?.filter((l: any) => 
        l.user_id === userId && l.activity_type === 'login_failed'
      ) || []
      
      if (failures.length >= 3 && logins.length > 0) {
        const lastFailure = failures.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        
        const successAfterFailure = logins.find(l => 
          l.timestamp > new Date(lastFailure.created_at) &&
          l.ip !== lastFailure.ip_address
        )
        
        if (successAfterFailure) {
          anomalies.push({
            type: 'possible_account_takeover',
            description: 'Login bem-sucedido de novo IP após múltiplas falhas',
            severity: 'critical',
            timestamp: now.toISOString(),
            details: {
              userId,
              failedIP: lastFailure.ip_address,
              successIP: successAfterFailure.ip,
              failureCount: failures.length
            }
          })
        }
      }
    }

    console.log(`[detect-anomalies] Detected ${anomalies.length} anomalies`)

    return new Response(
      JSON.stringify({ anomalies }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('[detect-anomalies] Error:', error)

    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
