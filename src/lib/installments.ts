/**
 * Regras de parcelamento no cartão de crédito (Asaas)
 * Configuráveis pelo super admin em payment_settings.
 * Padrão: 1x e 2x sem juros; 3x a 12x com juros (Tabela Price).
 */
export const MAX_INSTALLMENTS = 12;
export const INTEREST_FREE_INSTALLMENTS = 2;
/** Taxa mensal de parcelamento do Asaas repassada ao cliente */
export const MONTHLY_INTEREST_RATE = 0.0299;

export interface InstallmentRules {
  maxInterestFree: number;
  maxTotal: number;
  /** taxa mensal em fração (ex.: 0.0299) */
  monthlyRate: number;
}

export const DEFAULT_RULES: InstallmentRules = {
  maxInterestFree: INTEREST_FREE_INSTALLMENTS,
  maxTotal: MAX_INSTALLMENTS,
  monthlyRate: MONTHLY_INTEREST_RATE,
};

export interface InstallmentOption {
  n: number;
  installmentValue: number;
  totalValue: number;
  hasInterest: boolean;
  label: string;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Calcula o valor da parcela usando Tabela Price quando há juros. */
export function calcInstallment(amount: number, n: number, rules: InstallmentRules = DEFAULT_RULES) {
  if (n <= rules.maxInterestFree) {
    const installmentValue = round2(amount / n);
    return {
      installmentValue,
      totalValue: round2(installmentValue * n),
      hasInterest: false,
    };
  }
  const i = rules.monthlyRate;
  if (i <= 0) {
    const installmentValue = round2(amount / n);
    return { installmentValue, totalValue: round2(installmentValue * n), hasInterest: false };
  }
  const factor = (amount * i) / (1 - Math.pow(1 + i, -n));
  const installmentValue = round2(factor);
  return {
    installmentValue,
    totalValue: round2(installmentValue * n),
    hasInterest: true,
  };
}

export function buildInstallmentOptions(
  amount: number,
  rules: InstallmentRules = DEFAULT_RULES
): InstallmentOption[] {
  const max = Math.max(1, Math.min(12, rules.maxTotal));
  return Array.from({ length: max }, (_, idx) => {
    const n = idx + 1;
    const { installmentValue, totalValue, hasInterest } = calcInstallment(amount, n, rules);
    return {
      n,
      installmentValue,
      totalValue,
      hasInterest,
      label: n === 1 ? 'À vista, sem juros' : hasInterest ? `${n}x com juros` : `${n}x sem juros`,
    };
  });
}
