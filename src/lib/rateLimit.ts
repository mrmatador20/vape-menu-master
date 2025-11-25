import { supabase } from '@/integrations/supabase/client';

interface RateLimitConfig {
  action: string;
  maxAttempts: number;
  windowMinutes: number;
  blockMinutes: number;
}

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  blockExpiresAt?: Date;
  message?: string;
}

/**
 * Check rate limit for a specific action
 * @param config Rate limit configuration
 * @returns Rate limit result with allowed status
 */
export const checkRateLimit = async (config: RateLimitConfig): Promise<RateLimitResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const identifier = user?.id || 'anonymous';

    // Get current rate limit record
    const { data: rateLimitRecord, error: fetchError } = await supabase
      .from('rate_limit_tracking')
      .select('*')
      .eq('identifier', identifier)
      .eq('action_type', config.action)
      .maybeSingle();

    if (fetchError) {
      console.error('Rate limit check error:', fetchError);
      return { allowed: true }; // Fail open to avoid blocking legitimate users
    }

    const now = new Date();
    const windowStart = rateLimitRecord?.window_start ? new Date(rateLimitRecord.window_start) : null;

    // Check if user is currently blocked
    if (rateLimitRecord?.is_blocked) {
      const blockExpiresAt = rateLimitRecord.block_expires_at 
        ? new Date(rateLimitRecord.block_expires_at)
        : null;

      if (blockExpiresAt && now < blockExpiresAt) {
        const minutesRemaining = Math.ceil((blockExpiresAt.getTime() - now.getTime()) / (1000 * 60));
        return {
          allowed: false,
          blockExpiresAt,
          message: `Você atingiu o limite de tentativas. Tente novamente em ${minutesRemaining} minuto(s).`
        };
      }

      // Block expired, reset
      await supabase
        .from('rate_limit_tracking')
        .update({
          is_blocked: false,
          block_expires_at: null,
          attempt_count: 0,
          window_start: now.toISOString(),
        })
        .eq('id', rateLimitRecord.id);

      return { allowed: true, remainingAttempts: config.maxAttempts };
    }

    // Check if we're within the time window
    const windowExpired = !windowStart || 
      (now.getTime() - windowStart.getTime()) > (config.windowMinutes * 60 * 1000);

    if (windowExpired) {
      // Reset window
      if (rateLimitRecord) {
        await supabase
          .from('rate_limit_tracking')
          .update({
            attempt_count: 1,
            window_start: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', rateLimitRecord.id);
      } else {
        await supabase
          .from('rate_limit_tracking')
          .insert({
            identifier,
            action_type: config.action,
            attempt_count: 1,
            window_start: now.toISOString(),
          });
      }

      return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
    }

    // Within window, check attempts
    const currentAttempts = rateLimitRecord?.attempt_count || 0;

    if (currentAttempts >= config.maxAttempts) {
      // Block user
      const blockExpiresAt = new Date(now.getTime() + config.blockMinutes * 60 * 1000);
      
      await supabase
        .from('rate_limit_tracking')
        .update({
          is_blocked: true,
          block_expires_at: blockExpiresAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', rateLimitRecord!.id);

      return {
        allowed: false,
        blockExpiresAt,
        message: `Você atingiu o limite de ${config.maxAttempts} tentativas. Sua conta será bloqueada por ${config.blockMinutes} minutos.`
      };
    }

    // Increment attempt count
    await supabase
      .from('rate_limit_tracking')
      .update({
        attempt_count: currentAttempts + 1,
        updated_at: now.toISOString(),
      })
      .eq('id', rateLimitRecord!.id);

    return { 
      allowed: true, 
      remainingAttempts: config.maxAttempts - currentAttempts - 1 
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true }; // Fail open
  }
};

/**
 * Reset rate limit for a specific action (e.g., after successful login)
 */
export const resetRateLimit = async (action: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const identifier = user?.id || 'anonymous';

    await supabase
      .from('rate_limit_tracking')
      .delete()
      .eq('identifier', identifier)
      .eq('action_type', action);
  } catch (error) {
    console.error('Rate limit reset error:', error);
  }
};
