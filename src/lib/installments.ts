/**
 * Regras de parcelamento no cartão de crédito (Asaas)
 * 1x e 2x  -> sem juros (lojista assume)
 * 3x a 12x -> com juros repassados ao cliente (Tabela Price)
 */
export const MAX_INSTALLMENTS = 12;
export const INTEREST_FREE_INSTALLMENTS = 2;
/** Taxa mensal de parcelamento do Asaas repassada ao cliente */
export const MONTHLY_INTEREST_RATE = 0.0299;

export interface InstallmentOption {
  n: number;
  installmentValue: number;
  totalValue: number;
  hasInterest: boolean;
  label: string;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Calcula o valor da parcela usando Tabela Price quando há juros. */
export function calcInstallment(amount: number, n: number) {
  if (n <= INTEREST_FREE_INSTALLMENTS) {
    const installmentValue = round2(amount / n);
    return {
      installmentValue,
      totalValue: round2(installmentValue * n),
      hasInterest: false,
    };
  }
  const i = MONTHLY_INTEREST_RATE;
  const factor = (amount * i) / (1 - Math.pow(1 + i, -n));
  const installmentValue = round2(factor);
  return {
    installmentValue,
    totalValue: round2(installmentValue * n),
    hasInterest: true,
  };
}

export function buildInstallmentOptions(amount: number, max = MAX_INSTALLMENTS): InstallmentOption[] {
  return Array.from({ length: max }, (_, idx) => {
    const n = idx + 1;
    const { installmentValue, totalValue, hasInterest } = calcInstallment(amount, n);
    return {
      n,
      installmentValue,
      totalValue,
      hasInterest,
      label: n === 1 ? 'À vista, sem juros' : hasInterest ? `${n}x com juros` : `${n}x sem juros`,
    };
  });
}
