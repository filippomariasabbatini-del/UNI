/**
 * Costanti senza dipendenze: importabili anche dagli script del browser
 * (site.ts usa Zod e non deve finire nel bundle client).
 */
export const LOCALE_CODES = ['it', 'en', 'nl'] as const;
export type Locale = (typeof LOCALE_CODES)[number];

/** Tag BCP 47 usato per Intl e per og:locale */
export const INTL_LOCALE: Record<Locale, string> = { it: 'it-IT', en: 'en-GB', nl: 'nl-NL' };

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Orario di una giornata: [apertura, chiusura] in HH:MM, oppure null se chiuso */
export type DayHours = [string, string] | null;
export type WeekHours = Record<Weekday, DayHours>;

export const STUDIO_IDS = ['nijmegen', 'roma'] as const;
export type StudioId = (typeof STUDIO_IDS)[number];
