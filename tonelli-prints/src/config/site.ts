import { z } from 'astro/zod';

/**
 * Configurazione del sito: dati non testuali (contatti, sedi, orari, lingue, flag).
 * I testi stanno in src/content/, i prezzi in src/config/pricing.ts,
 * i colori in src/styles/tokens.css.
 * Lo schema Zod fa fallire la build se un valore è mancante o malformato.
 */

export const LOCALE_CODES = ['it', 'en', 'nl'] as const;
export type Locale = (typeof LOCALE_CODES)[number];

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato orario atteso: HH:MM');
const dayHours = z.tuple([time, time]).nullable();

const studioSchema = z.object({
  id: z.enum(['nijmegen', 'roma']),
  primary: z.boolean(),
  countryCode: z.enum(['NL', 'IT']),
  timeZone: z.string().min(1),
  phone: z.string().regex(/^\+\d{8,15}$/, 'Telefono in formato E.164, es. +393899675683'),
  phoneDisplay: z.string().min(1),
  /** null finché il dato non è confermato: non viene mostrato né messo nel JSON-LD */
  streetAddress: z.string().nullable(),
  postalCode: z.string().nullable(),
  /** Stampanti attive: usato nel badge "live" dell'hero per lo studio principale */
  printers: z.number().int().positive().nullable(),
  hours: z.object({
    /** false = orari segnaposto: non vengono pubblicati nel JSON-LD */
    confirmed: z.boolean(),
    week: z.object({
      mon: dayHours,
      tue: dayHours,
      wed: dayHours,
      thu: dayHours,
      fri: dayHours,
      sat: dayHours,
      sun: dayHours,
    }),
  }),
});

const siteSchema = z.object({
  name: z.string().min(1),
  url: z.url(),
  defaultLocale: z.enum(LOCALE_CODES),
  locales: z
    .array(
      z.object({
        code: z.enum(LOCALE_CODES),
        label: z.string().min(1),
        name: z.string().min(1),
        /** true solo se esistono tutti i file src/content/<collection>/<code>.json */
        enabled: z.boolean(),
      }),
    )
    .min(1),
  themeColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  email: z.email(),
  social: z.object({
    linkedin: z.url(),
    instagram: z.url(),
  }),
  legal: z.object({
    /** Numero KVK (Camera di commercio NL). null = "in attesa" */
    kvk: z.string().nullable(),
    vat: z.string().nullable(),
  }),
  studios: z.array(studioSchema).min(1),
  analytics: z.object({
    /** Solo strumenti cookieless. null = nessun tracker */
    provider: z.enum(['plausible', 'umami']).nullable(),
    scriptUrl: z.url().nullable(),
    /** data-domain (Plausible) oppure data-website-id (Umami) */
    siteId: z.string().nullable(),
  }),
  cookies: z.object({
    /** true solo se il sito imposta cookie non essenziali: il banner mostra Accetta/Rifiuta */
    hasNonEssential: z.boolean(),
  }),
});

// TODO(dati): orari di apertura NON confermati. Segnaposto lun-ven 09:00-18:00.
const PLACEHOLDER_WEEK = {
  mon: ['09:00', '18:00'],
  tue: ['09:00', '18:00'],
  wed: ['09:00', '18:00'],
  thu: ['09:00', '18:00'],
  fri: ['09:00', '18:00'],
  sat: null,
  sun: null,
} satisfies z.input<typeof studioSchema>['hours']['week'];

export const site = siteSchema.parse({
  name: 'Tonelli Prints',
  url: 'https://tonelliprints.com',
  defaultLocale: 'it',
  locales: [
    { code: 'it', label: 'IT', name: 'Italiano', enabled: true },
    // TODO(i18n): aggiungere src/content/*/en.json e src/content/legal/en/, poi enabled: true
    { code: 'en', label: 'EN', name: 'English', enabled: false },
    // TODO(i18n): aggiungere src/content/*/nl.json e src/content/legal/nl/, poi enabled: true
    { code: 'nl', label: 'NL', name: 'Nederlands', enabled: false },
  ],
  themeColor: '#ffffff',
  email: 'info@tonelliprints.com',
  social: {
    linkedin: 'https://www.linkedin.com/in/riccardotonelli02',
    instagram: 'https://www.instagram.com/tonelliprints',
  },
  legal: {
    kvk: null, // TODO(dati): numero KVK in attesa
    vat: null, // TODO(dati): partita IVA / BTW
  },
  studios: [
    {
      id: 'nijmegen',
      primary: true,
      countryCode: 'NL',
      timeZone: 'Europe/Amsterdam',
      phone: '+31640242147',
      phoneDisplay: '+31 6 40 24 21 47',
      streetAddress: null, // TODO(dati): indirizzo dello studio di Nimega
      postalCode: null,
      printers: 8,
      hours: { confirmed: false, week: PLACEHOLDER_WEEK },
    },
    {
      id: 'roma',
      primary: false,
      countryCode: 'IT',
      timeZone: 'Europe/Rome',
      phone: '+393899675683',
      phoneDisplay: '+39 389 967 5683',
      streetAddress: null, // TODO(dati): "Via Monteciccardo", civico e CAP da confermare
      postalCode: null,
      printers: null,
      hours: { confirmed: false, week: PLACEHOLDER_WEEK },
    },
  ],
  analytics: { provider: null, scriptUrl: null, siteId: null },
  cookies: { hasNonEssential: false },
});

export type Site = z.infer<typeof siteSchema>;
export type Studio = Site['studios'][number];
export type StudioId = Studio['id'];
export type WeekHours = Studio['hours']['week'];

export const enabledLocales: Locale[] = site.locales.filter((l) => l.enabled).map((l) => l.code);

if (!enabledLocales.includes(site.defaultLocale)) {
  throw new Error(`site.defaultLocale "${site.defaultLocale}" deve avere enabled: true`);
}
