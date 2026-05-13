import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnomalyAlert {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: any
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Authentication: admin only
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[security-anomaly-alerts] Starting anomaly detection...')

    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000)

    // Fetch recent login activity
    const { data: loginLogs, error: loginError } = await supabase
      .from('user_activity_logs')
      .select('*')
      .in('activity_type', ['login', 'login_failed', 'mfa_failed'])
      .gte('created_at', last24Hours.toISOString())
      .order('created_at', { ascending: false })

    if (loginError) {
      console.error('[security-anomaly-alerts] Error fetching login logs:', loginError)
      throw loginError
    }

    // Fetch blocked IPs
    const { data: blockedIPs, error: blockedError } = await supabase
      .from('rate_limit_tracking')
      .select('*')
      .eq('is_blocked', true)

    if (blockedError) {
      console.error('[security-anomaly-alerts] Error fetching blocked IPs:', blockedError)
      throw blockedError
    }

    const alerts: AnomalyAlert[] = []

    // Detection 1: Multiple failed logins from same IP (Brute Force)
    const ipFailures: Record<string, number> = {}
    loginLogs?.forEach((log) => {
      if (log.activity_type === 'login_failed' && log.ip_address) {
        ipFailures[log.ip_address] = (ipFailures[log.ip_address] || 0) + 1
      }
    })

    Object.entries(ipFailures).forEach(([ip, count]) => {
      if (count >= 5) {
        alerts.push({
          type: 'brute_force_attempt',
          description: `${count} tentativas de login falhas do IP ${ip} nas últimas 24h`,
          severity: count >= 10 ? 'critical' : 'high',
          details: { ip, count }
        })
      }
    })

    // Detection 2: Multiple failed logins for same user (Account Compromise)
    const userFailures: Record<string, number> = {}
    loginLogs?.forEach((log) => {
      if (log.activity_type === 'login_failed') {
        userFailures[log.user_id] = (userFailures[log.user_id] || 0) + 1
      }
    })

    Object.entries(userFailures).forEach(([userId, count]) => {
      if (count >= 3) {
        alerts.push({
          type: 'account_compromise_attempt',
          description: `${count} tentativas de login falhas para o usuário nas últimas 24h`,
          severity: count >= 5 ? 'critical' : 'high',
          details: { userId, count }
        })
      }
    })

    // Detection 3: MFA failures (potential bypass attempts)
    const mfaFailures = loginLogs?.filter(l => l.activity_type === 'mfa_failed') || []
    if (mfaFailures.length >= 3) {
      const mfaByUser: Record<string, number> = {}
      mfaFailures.forEach(log => {
        mfaByUser[log.user_id] = (mfaByUser[log.user_id] || 0) + 1
      })

      Object.entries(mfaByUser).forEach(([userId, count]) => {
        if (count >= 3) {
          alerts.push({
            type: 'mfa_bypass_attempt',
            description: `${count} falhas de verificação 2FA para o mesmo usuário`,
            severity: 'critical',
            details: { userId, count }
          })
        }
      })
    }

    // Detection 4: High number of blocked IPs (DDoS indicator)
    if (blockedIPs && blockedIPs.length >= 10) {
      alerts.push({
        type: 'ddos_indicator',
        description: `${blockedIPs.length} IPs bloqueados por rate limiting`,
        severity: 'critical',
        details: { blockedCount: blockedIPs.length }
      })
    }

    // Detection 5: Unusual access times (2am-5am)
    const recentLateLogins = loginLogs?.filter(log => {
      const hour = new Date(log.created_at).getHours()
      const isRecent = new Date(log.created_at) > lastHour
      return hour >= 2 && hour <= 5 && isRecent
    }) || []

    if (recentLateLogins.length >= 3) {
      alerts.push({
        type: 'unusual_access_time',
        description: `${recentLateLogins.length} acessos entre 2h-5h na última hora`,
        severity: 'medium',
        details: { count: recentLateLogins.length }
      })
    }

    // Detection 6: Rapid successive logins (credential stuffing)
    const ipLoginTimes: Record<string, Date[]> = {}
    loginLogs?.forEach((log) => {
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
        const durationMinutes = (times[times.length - 1].getTime() - times[0].getTime()) / (1000 * 60)
        
        if (durationMinutes < 10) {
          alerts.push({
            type: 'credential_stuffing',
            description: `${times.length} tentativas de login do IP ${ip} em ${Math.round(durationMinutes)} minutos`,
            severity: 'critical',
            details: { ip, count: times.length, durationMinutes: Math.round(durationMinutes) }
          })
        }
      }
    })

    console.log(`[security-anomaly-alerts] Detected ${alerts.length} anomalies`)

    // If there are critical or high severity alerts, send notifications
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high')
    
    if (criticalAlerts.length > 0 && resendApiKey) {
      // Get all admin users
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')

      if (adminRoles && adminRoles.length > 0) {
        // Get admin emails from auth.users via profiles
        const adminIds = adminRoles.map(r => r.user_id)
        
        for (const adminId of adminIds) {
          const { data: userData } = await supabase.auth.admin.getUserById(adminId)
          
          if (userData?.user?.email) {
            const alertsList = criticalAlerts.map(a => 
              `• [${a.severity.toUpperCase()}] ${a.description}`
            ).join('\n')

            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Alerta de Segurança</h1>
                </div>
                <div style="background: #fef2f2; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #fecaca;">
                  <h2 style="color: #991b1b; margin-top: 0;">Anomalias Detectadas</h2>
                  <p style="color: #7f1d1d;">O sistema de monitoramento detectou as seguintes atividades suspeitas:</p>
                  <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #ef4444;">
                    <pre style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #374151;">${alertsList}</pre>
                  </div>
                  <p style="color: #7f1d1d; margin-top: 20px;">
                    <strong>Ação recomendada:</strong> Acesse o Dashboard de Segurança para análise detalhada.
                  </p>
                  <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                    Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            `

            try {
              const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: 'NebulaVape Security <security@resend.dev>',
                  to: userData.user.email,
                  subject: `🚨 [ALERTA] ${criticalAlerts.length} anomalia(s) de segurança detectada(s)`,
                  html: emailHtml
                })
              })

              if (emailResponse.ok) {
                console.log(`[security-anomaly-alerts] Alert email sent to ${userData.user.email}`)
                
                // Log the notification
                await supabase.from('security_notification_logs').insert({
                  user_id: adminId,
                  notification_type: 'security_anomaly',
                  channel: 'email',
                  recipient: userData.user.email,
                  subject: `${criticalAlerts.length} anomalia(s) de segurança detectada(s)`,
                  message_content: alertsList,
                  status: 'sent',
                  delivered_at: new Date().toISOString(),
                  metadata: { alerts: criticalAlerts }
                })
              } else {
                console.error('[security-anomaly-alerts] Failed to send email:', await emailResponse.text())
              }
            } catch (emailError) {
              console.error('[security-anomaly-alerts] Email error:', emailError)
            }
          }
        }
      }
    }

    // Store alerts in activity logs for dashboard
    for (const alert of criticalAlerts) {
      const { error: logError } = await supabase.from('user_activity_logs').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // System user
        activity_type: `anomaly_${alert.type}`,
        severity: alert.severity,
        metadata: alert.details,
        ip_address: alert.details.ip || null
      })
      if (logError) {
        console.error('[security-anomaly-alerts] Failed to log alert:', logError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsDetected: alerts.length,
        criticalAlerts: criticalAlerts.length,
        alerts 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[security-anomaly-alerts] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
