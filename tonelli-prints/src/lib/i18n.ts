import { enabledLocales, site, type Locale } from '../config/site';

/** Sostituisce i segnaposto {chiave} in una stringa di interfaccia. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Percorso assoluto per una lingua: la lingua di default non ha prefisso. */
export function localePath(locale: Locale, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return locale === site.defaultLocale ? clean : `/${locale}${clean}`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).href;
}

/** Valore del parametro di route `[...locale]`: undefined per la lingua di default. */
export function localeFromParam(param: string | undefined): Locale {
  const locale = enabledLocales.find((code) => code === param);
  return locale ?? site.defaultLocale;
}

/** getStaticPaths condiviso da tutte le pagine sotto src/pages/[...locale]/ */
export function localeStaticPaths(): { params: { locale: string | undefined } }[] {
  return enabledLocales.map((locale) => ({
    params: { locale: locale === site.defaultLocale ? undefined : locale },
  }));
}

/** Alternates hreflang: solo lingue realmente pubblicate, più x-default. */
export function alternates(path: string): { hreflang: string; href: string }[] {
  const links = enabledLocales.map((locale) => ({
    hreflang: locale as string,
    href: absoluteUrl(localePath(locale, path)),
  }));
  return [
    ...links,
    { hreflang: 'x-default', href: absoluteUrl(localePath(site.defaultLocale, path)) },
  ];
}

/** Tag BCP 47 usato per Intl e per og:locale */
export const INTL_LOCALE: Record<Locale, string> = { it: 'it-IT', en: 'en-GB', nl: 'nl-NL' };
