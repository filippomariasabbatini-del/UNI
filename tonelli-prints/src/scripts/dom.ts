/** Legge e fa il parse di un attributo data-* JSON scritto in build dai componenti. */
export function readJson<T>(element: HTMLElement, key: string): T | null {
  const raw = element.dataset[key];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Tag BCP 47 per Intl ricavato da <html lang>. */
export function intlLocale(): string {
  const map: Record<string, string> = { it: 'it-IT', en: 'en-GB', nl: 'nl-NL' };
  return map[document.documentElement.lang] ?? 'it-IT';
}
