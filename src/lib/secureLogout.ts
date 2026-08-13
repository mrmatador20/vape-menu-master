import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';

// Keys that hold user-specific data and must be wiped on logout.
// Anything that is purely UI/cosmetic (theme, cookie banner consent) is preserved.
const USER_SCOPED_LOCAL_KEYS = [
  'vape-menu-cart',         // CART_STORAGE_KEY
  'discount_code',
  'checkout_data',
  'user_preferences',
  'influencer_coupon_code',
  'password_reset_flow',
  '2fa_verified',
  '2fa_verified_session',  // MFA_SESSION_KEY — cleared ONLY on explicit logout
];

/**
 * Securely sign the user out:
 *  - Invalidate ALL sessions across devices (scope: 'global')
 *  - Clear React Query cache so cached PII isn't visible to next user
 *  - Remove user-scoped data from localStorage
 *  - Clear sessionStorage entirely
 */
export async function secureSignOut(): Promise<{ error: Error | null }> {
  let signOutError: Error | null = null;

  try {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) signOutError = error;
  } catch (e: any) {
    signOutError = e;
  }

  // Always clear local state, even if the network signOut failed.
  try {
    queryClient.cancelQueries();
    queryClient.removeQueries();
    queryClient.clear();
  } catch (e) {
    console.warn('[secureSignOut] queryClient clear failed', e);
  }

  try {
    for (const key of USER_SCOPED_LOCAL_KEYS) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('[secureSignOut] localStorage cleanup failed', e);
  }

  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn('[secureSignOut] sessionStorage cleanup failed', e);
  }

  return { error: signOutError };
}
