import type { MaterialId, PricingConfig } from '../config/pricing';

export type Estimate =
  | { available: true; quantity: number; unitPrice: number; total: number; leadDays: number | null }
  | { available: false; quantity: number };

/** Controlli strutturali sulla config: lancia un errore (e quindi ferma la build) se la curva non è valida. */
export function assertPricingConfig(config: PricingConfig): void {
  const { curve, quantity, extraLeadDays } = config;
  if (curve.length < 2) throw new Error('pricing.curve: servono almeno due scaglioni');
  curve.forEach((point, index) => {
    const previous = curve[index - 1];
    if (point.factor <= 0) throw new Error('pricing.curve: i moltiplicatori devono essere > 0');
    if (!previous) return;
    if (point.quantity <= previous.quantity) {
      throw new Error('pricing.curve: quantità non in ordine strettamente crescente');
    }
    if (point.factor > previous.factor) {
      throw new Error('pricing.curve: i moltiplicatori devono essere decrescenti');
    }
    // Il totale q·f(q) non deve mai scendere all'interno dello scaglione.
    const slope = (point.factor - previous.factor) / (point.quantity - previous.quantity);
    if (point.factor + point.quantity * slope < 0) {
      throw new Error(`pricing.curve: il totale scende prima di ${point.quantity} pezzi`);
    }
  });
  if (quantity.min >= quantity.max || quantity.step <= 0) {
    throw new Error('pricing.quantity: intervallo non valido');
  }
  if (quantity.default < quantity.min || quantity.default > quantity.max) {
    throw new Error('pricing.quantity.default fuori intervallo');
  }
  extraLeadDays.forEach((tier, index) => {
    const previous = extraLeadDays[index - 1];
    if (previous && tier.fromQuantity <= previous.fromQuantity) {
      throw new Error('pricing.extraLeadDays: soglie non in ordine crescente');
    }
  });
}

export function clampQuantity(value: number, config: PricingConfig): number {
  const { min, max, step } = config.quantity;
  if (!Number.isFinite(value)) return config.quantity.default;
  const snapped = Math.round(value / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

/** Moltiplicatore del prezzo unitario: interpolazione lineare tra gli scaglioni, costante fuori dagli estremi. */
export function unitFactor(quantity: number, curve: PricingConfig['curve']): number {
  const first = curve[0];
  const last = curve[curve.length - 1];
  if (!first || !last) throw new Error('pricing.curve vuota');
  if (quantity <= first.quantity) return first.factor;
  if (quantity >= last.quantity) return last.factor;
  for (let index = 1; index < curve.length; index += 1) {
    const lower = curve[index - 1];
    const upper = curve[index];
    if (!lower || !upper) break;
    if (quantity <= upper.quantity) {
      const t = (quantity - lower.quantity) / (upper.quantity - lower.quantity);
      return lower.factor + t * (upper.factor - lower.factor);
    }
  }
  return last.factor;
}

export function extraLeadDays(quantity: number, tiers: PricingConfig['extraLeadDays']): number {
  return tiers.reduce((days, tier) => (quantity >= tier.fromQuantity ? tier.days : days), 0);
}

export function estimate(
  material: MaterialId,
  rawQuantity: number,
  config: PricingConfig,
): Estimate {
  const quantity = clampQuantity(rawQuantity, config);
  const { unitPriceAt100, baseLeadDays } = config.materials[material];
  if (unitPriceAt100 === null) return { available: false, quantity };
  const exactUnit = unitPriceAt100 * unitFactor(quantity, config.curve);
  return {
    available: true,
    quantity,
    unitPrice: Math.round(exactUnit * 100) / 100,
    total: Math.round(exactUnit * quantity),
    leadDays:
      baseLeadDays === null ? null : baseLeadDays + extraLeadDays(quantity, config.extraLeadDays),
  };
}
