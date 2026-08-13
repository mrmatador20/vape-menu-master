import { supabase } from '@/integrations/supabase/client';

export const REPLAY_MESSAGE =
  'Este código já foi utilizado. Aguarde o próximo código no seu aplicativo.';

/**
 * Janela de tempo estrita do TOTP (30s por passo).
 * O passo é sempre calculado em UTC: Math.floor(Date.now() / 1000 / 30).
 */
export const TOTP_PERIOD_SECONDS = 30;

/** Passo TOTP atual (UTC), alinhado com Google Authenticator/Authy. */
export const currentTotpStep = (): number =>
  Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);

/**
 * Tolerância máxima aceita para um desafio 2FA: janela atual + 1 passo
 * (window: 1 -> no máximo 60s de vida).
 */
export const TOTP_MAX_AGE_MS = 2 * TOTP_PERIOD_SECONDS * 1000;

const sha256Hex = async (value: string): Promise<string> => {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export interface ClaimResult {
  allowed: boolean;
  error?: string;
}

/**
 * Reserva (consome) um código TOTP no servidor para a janela de 30s atual.
 * Se o mesmo código já tiver sido enviado nessa janela, a reserva é negada
 * (proteção anti-replay).
 */
export const claimTotpCode = async (code: string): Promise<ClaimResult> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { allowed: false, error: 'Sessão inválida. Faça login novamente.' };
    }

    // Nunca enviamos o código em texto puro ao banco
    const codeHash = await sha256Hex(`${user.id}:${code}`);

    const { data, error } = await supabase.rpc('claim_totp_code', {
      p_code_hash: codeHash,
    });

    if (error) {
      console.error('❌ Anti-replay: falha ao reservar código TOTP', error);
      return { allowed: false, error: 'Erro ao validar o código. Tente novamente.' };
    }

    const result = data as { allowed?: boolean; reason?: string } | null;

    if (!result?.allowed) {
      if (result?.reason === 'replay') {
        return { allowed: false, error: REPLAY_MESSAGE };
      }
      return { allowed: false, error: 'Não foi possível validar o código.' };
    }

    return { allowed: true };
  } catch (err) {
    console.error('❌ Anti-replay: erro inesperado', err);
    return { allowed: false, error: 'Erro ao validar o código. Tente novamente.' };
  }
};
