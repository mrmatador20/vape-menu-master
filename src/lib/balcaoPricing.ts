/**
 * Cálculo do preço promocional exibido no Balcão (PDV),
 * idêntico ao aplicado na loja virtual.
 * O valor final gravado é sempre recalculado no servidor.
 */
export const getPromoPrice = (
  basePrice: number,
  discountValue?: number | null,
  discountType?: 'percent' | 'fixed' | null,
): { base: number; unit: number; hasPromo: boolean } => {
  const base = Number(basePrice) || 0;
  const dv = Number(discountValue) || 0;
  if (dv <= 0) return { base, unit: base, hasPromo: false };
  const unit =
    (discountType || 'percent') === 'percent'
      ? base * (1 - Math.min(dv, 100) / 100)
      : base - dv;
  const rounded = Math.max(Number(unit.toFixed(2)), 0);
  return { base, unit: rounded, hasPromo: rounded < base };
};
