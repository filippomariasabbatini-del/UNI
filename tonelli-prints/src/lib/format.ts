/** Funzioni pure di formattazione, senza dipendenze: usate sia in build sia nel browser. */

/** Sostituisce i segnaposto {chiave} in una stringa di interfaccia. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function formatCurrency(
  value: number,
  intlLocale: string,
  currency: string,
  fractionDigits: 0 | 2,
): string {
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
