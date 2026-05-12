import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'fv_session_id';
const VIEWED_KEY = 'fv_viewed_products';
const VIEW_TTL_MS = 30 * 60 * 1000; // 30 min: avoid double-counting same session

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function alreadyViewed(productId: string) {
  try {
    const raw = sessionStorage.getItem(VIEWED_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const last = map[productId] || 0;
    if (Date.now() - last < VIEW_TTL_MS) return true;
    map[productId] = Date.now();
    sessionStorage.setItem(VIEWED_KEY, JSON.stringify(map));
    return false;
  } catch {
    return false;
  }
}

/** Fire-and-forget product view tracking. Safe for anon users. */
export function trackProductView(productId: string) {
  if (!productId) return;
  if (alreadyViewed(productId)) return;
  const session_id = getSessionId();
  supabase.auth.getUser().then(({ data }) => {
    supabase
      .from('product_views')
      .insert({
        product_id: productId,
        user_id: data.user?.id || null,
        session_id,
      })
      .then(() => {});
  });
}

export function useTrackProductView(productId?: string | null, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !productId) return;
    trackProductView(productId);
  }, [productId, enabled]);
}
