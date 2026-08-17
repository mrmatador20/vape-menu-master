import { supabase } from '@/integrations/supabase/client';

/**
 * Persistência da verificação 2FA.
 *
 * - `2fa_verified_session`: flag local (por usuário) indicando que o 2FA já foi
 *   validado nesta sessão de login. Removida APENAS no logout explícito.
 * - `trusted_device_token`: token do dispositivo confiável (30 dias), espelhando
 *   o registro em `trusted_devices`. Sobrevive ao logout, como esperado.
 *
 * IMPORTANTE (segurança): a flag local nunca concede acesso sozinha. O acesso
 * só é liberado quando o servidor confirma AAL2 ou quando existe um dispositivo
 * confiável válido no banco.
 */

export const MFA_SESSION_KEY = '2fa_verified_session';
export const TRUSTED_DEVICE_KEY = 'trusted_device_token';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const generateDeviceFingerprint = (): string => {
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    window.screen.colorDepth,
    window.screen.width + 'x' + window.screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
  ].join('|');

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    hash = (hash << 5) - hash + fingerprint.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

/** Marca o 2FA como verificado para o usuário atual (persiste em F5). */
export const markMfaVerified = (userId: string) => {
  try {
    localStorage.setItem(
      MFA_SESSION_KEY,
      JSON.stringify({ userId, verified: true, verifiedAt: Date.now() })
    );
    sessionStorage.setItem('2fa_verified', 'true');
  } catch (e) {
    console.warn('[mfaSession] failed to persist 2FA flag', e);
  }
};

/** Lê a flag local de 2FA verificado para o usuário. */
export const hasMfaSessionFlag = (userId: string): boolean => {
  try {
    const raw = localStorage.getItem(MFA_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.verified === true && parsed?.userId === userId;
  } catch {
    return false;
  }
};

/** Remove a flag de sessão 2FA (somente no logout explícito). */
export const clearMfaSession = () => {
  try {
    localStorage.removeItem(MFA_SESSION_KEY);
    sessionStorage.removeItem('2fa_verified');
    sessionStorage.removeItem('admin_2fa_verified');
  } catch {
    /* noop */
  }
};

/** Salva o token local de dispositivo confiável por 30 dias. */
export const saveTrustedDeviceToken = (userId: string, token?: string) => {
  try {
    localStorage.setItem(
      TRUSTED_DEVICE_KEY,
      JSON.stringify({
        userId,
        token: token ?? generateDeviceFingerprint(),
        expiresAt: Date.now() + THIRTY_DAYS_MS,
      })
    );
  } catch (e) {
    console.warn('[mfaSession] failed to persist trusted device token', e);
  }
};

/** Retorna o token local válido do dispositivo confiável, se existir. */
export const readTrustedDeviceToken = (userId: string): string | null => {
  try {
    const raw = localStorage.getItem(TRUSTED_DEVICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId) return null;
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(TRUSTED_DEVICE_KEY);
      return null;
    }
    return parsed.token as string;
  } catch {
    return null;
  }
};

export const clearTrustedDeviceToken = () => {
  try {
    localStorage.removeItem(TRUSTED_DEVICE_KEY);
  } catch {
    /* noop */
  }
};

/** Validação server-side do dispositivo confiável (30 dias). */
export const isDeviceTrustedOnServer = async (userId: string): Promise<boolean> => {
  try {
    const fingerprint = generateDeviceFingerprint();
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('id, last_used_at')
      .eq('user_id', userId)
      .eq('device_fingerprint', fingerprint)
      .eq('is_trusted', true)
      .maybeSingle();

    if (error || !data) {
      clearTrustedDeviceToken();
      return false;
    }

    const days = (Date.now() - new Date(data.last_used_at).getTime()) / 86400000;
    if (days > 30) {
      await supabase.from('trusted_devices').update({ is_trusted: false }).eq('id', data.id);
      clearTrustedDeviceToken();
      return false;
    }

    await supabase
      .from('trusted_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    saveTrustedDeviceToken(userId, fingerprint);
    return true;
  } catch (e) {
    console.error('[mfaSession] trusted device check failed', e);
    return false;
  }
};

export interface MfaStatus {
  satisfied: boolean;
  isAAL2: boolean;
  isTrustedDevice: boolean;
  hasFlag: boolean;
  /** O usuário possui algum fator TOTP habilitado (2FA obrigatório para ele). */
  hasEnrolledFactor: boolean;
}

/**
 * Fonte de verdade para "o 2FA já foi resolvido?".
 * Combina AAL2 (servidor) + dispositivo confiável (banco) + flag local.
 */
export const getMfaStatus = async (userId: string): Promise<MfaStatus> => {
  let isAAL2 = false;
  // Se o usuário não tem fator TOTP habilitado, o servidor reporta nextLevel !== 'aal2'
  // e ele NUNCA conseguiria atingir AAL2 — nesse caso não há 2FA a exigir.
  let hasEnrolledFactor = false;
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    isAAL2 = data?.currentLevel === 'aal2';
    hasEnrolledFactor = data?.nextLevel === 'aal2';
  } catch {
    isAAL2 = false;
    hasEnrolledFactor = false;
  }

  const hasFlag = hasMfaSessionFlag(userId);
  let isTrustedDevice = false;

  if (!isAAL2 && hasEnrolledFactor) {
    isTrustedDevice = await isDeviceTrustedOnServer(userId);
  }

  const satisfied = isAAL2 || isTrustedDevice || !hasEnrolledFactor;
  if (satisfied) markMfaVerified(userId);

  return { satisfied, isAAL2, isTrustedDevice, hasFlag, hasEnrolledFactor };
};
