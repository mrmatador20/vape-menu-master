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
 * Check rate limit for a specific action.
 * All state mutations happen in a SECURITY DEFINER RPC so users cannot
 * bypass rate limits by tampering with the underlying table.
 */
export const checkRateLimit = async (config: RateLimitConfig): Promise<RateLimitResult> => {
  try {
    const { data, error } = await supabase.rpc('client_check_rate_limit', {
      p_action: config.action,
      p_max_attempts: config.maxAttempts,
      p_window_minutes: config.windowMinutes,
      p_block_minutes: config.blockMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true }; // Fail open to avoid blocking legitimate users
    }

    const payload = (data ?? {}) as {
      allowed?: boolean;
      remaining_attempts?: number;
      block_expires_at?: string;
      message?: string;
    };

    return {
      allowed: payload.allowed ?? true,
      remainingAttempts: payload.remaining_attempts,
      blockExpiresAt: payload.block_expires_at ? new Date(payload.block_expires_at) : undefined,
      message: payload.message,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true };
  }
};

/**
 * Reset rate limit for a specific action (e.g., after successful login).
 */
export const resetRateLimit = async (action: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('client_reset_rate_limit', { p_action: action });
    if (error) console.error('Rate limit reset error:', error);
  } catch (error) {
    console.error('Rate limit reset error:', error);
  }
};
