/**
 * PREZZI DEL CONFIGURATORE: UNICO FILE DA MODIFICARE.
 *
 * ATTENZIONE: I VALORI SONO SEGNAPOSTO DA VALIDARE CON TONELLI PRINTS.
 * Gli unici dati reali sono due punti per il PLA+ 2.0:
 *   - 100 pezzi  → 3,40 € al pezzo, consegna 4 giorni
 *   - 150 pezzi  → 449 € totali, 2,99 € al pezzo, consegna 5 giorni
 * Tutto il resto (altri scaglioni, giorni extra oltre i 150 pezzi) è una
 * curva plausibile costruita per passare da quei due punti.
 *
 * Questo file viene importato anche dal browser: niente dipendenze, solo dati.
 */

export const MATERIAL_IDS = [
  'pla-plus',
  'petg',
  'carbon-fiber',
  'silky-pla',
  'wood-pla',
  'tpu',
] as const;
export type MaterialId = (typeof MATERIAL_IDS)[number];

export interface MaterialPricing {
  /** Prezzo al pezzo in EUR per un ordine di 100 unità. null = dato mancante: il configuratore mostra "su richiesta" */
  unitPriceAt100: number | null;
  /** Giorni di consegna porta-a-porta per ordini piccoli. null = dato mancante */
  baseLeadDays: number | null;
}

export interface PricingConfig {
  currency: 'EUR';
  defaultMaterial: MaterialId;
  quantity: { min: number; max: number; step: number; default: number; ticks: number[] };
  /**
   * Scaglioni: moltiplicatore del prezzo al pezzo rispetto al prezzo a 100 unità.
   * Tra uno scaglione e il successivo il moltiplicatore è interpolato linearmente,
   * così il totale non scende mai aggiungendo pezzi.
   * Ordinati per quantità crescente, moltiplicatori decrescenti.
   */
  curve: { quantity: number; factor: number }[];
  /** Giorni da sommare a baseLeadDays a partire da una certa quantità */
  extraLeadDays: { fromQuantity: number; days: number }[];
  materials: Record<MaterialId, MaterialPricing>;
}

export const pricing: PricingConfig = {
  currency: 'EUR',
  defaultMaterial: 'pla-plus',
  quantity: { min: 10, max: 1000, step: 10, default: 150, ticks: [10, 100, 250, 500, 750, 1000] },
  curve: [
    { quantity: 10, factor: 1.6 }, // TODO(prezzi): segnaposto
    { quantity: 25, factor: 1.35 }, // TODO(prezzi): segnaposto
    { quantity: 50, factor: 1.15 }, // TODO(prezzi): segnaposto
    { quantity: 100, factor: 1.0 }, // DATO REALE: 3,40 €/pezzo
    { quantity: 150, factor: 0.88 }, // DATO REALE: 2,99 €/pezzo, 449 € totali
    { quantity: 250, factor: 0.8 }, // TODO(prezzi): segnaposto
    { quantity: 500, factor: 0.72 }, // TODO(prezzi): segnaposto
    { quantity: 750, factor: 0.67 }, // TODO(prezzi): segnaposto
    { quantity: 1000, factor: 0.62 }, // TODO(prezzi): segnaposto
  ],
  extraLeadDays: [
    { fromQuantity: 10, days: 0 }, // DATO REALE a 100 pezzi: 4 giorni
    { fromQuantity: 150, days: 1 }, // DATO REALE a 150 pezzi: 5 giorni (soglia esatta da validare)
    { fromQuantity: 500, days: 3 }, // TODO(prezzi): segnaposto
    { fromQuantity: 1000, days: 6 }, // TODO(prezzi): segnaposto
  ],
  materials: {
    'pla-plus': { unitPriceAt100: 3.4, baseLeadDays: 4 },
    petg: { unitPriceAt100: null, baseLeadDays: null }, // TODO(prezzi): dato mancante
    'carbon-fiber': { unitPriceAt100: null, baseLeadDays: null }, // TODO(prezzi): dato mancante
    'silky-pla': { unitPriceAt100: null, baseLeadDays: null }, // TODO(prezzi): dato mancante
    'wood-pla': { unitPriceAt100: null, baseLeadDays: null }, // TODO(prezzi): dato mancante
    tpu: { unitPriceAt100: null, baseLeadDays: null }, // TODO(prezzi): dato mancante
  },
};
