import { defineCollection, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { MATERIAL_IDS } from './config/pricing';
import { WEEKDAYS } from './config/site';

/**
 * Ogni collection ha un file per lingua: src/content/<collection>/<locale>.json
 * La build fallisce se un file viola lo schema.
 */

const text = z.string().trim().min(1);
/** Nota per chi compila i dati: non viene mai mostrata nel sito. */
const todo = z.string().optional();

const picture = ({ image }: SchemaContext) =>
  z.object({
    src: image(),
    // Alt obbligatorio a livello di schema
    alt: text,
  });

const perLocale = (name: string) => glob({ pattern: '*.json', base: `./src/content/${name}` });

const products = defineCollection({
  loader: perLocale('products'),
  schema: (context) =>
    z.object({
      items: z
        .array(
          z.object({
            id: z.string().regex(/^[a-z0-9-]+$/),
            title: text,
            summary: text,
            details: text,
            image: picture(context),
          }),
        )
        .min(1),
    }),
});

const projects = defineCollection({
  loader: perLocale('projects'),
  schema: (context) =>
    z.object({
      items: z
        .array(
          z.object({
            id: z.string().regex(/^[a-z0-9-]+$/),
            title: text,
            quote: text,
            author: text,
            place: text,
            image: picture(context),
          }),
        )
        .min(1),
    }),
});

const team = defineCollection({
  loader: perLocale('team'),
  schema: (context) =>
    z.object({
      items: z
        .array(
          z.object({
            id: z.string().regex(/^[a-z0-9-]+$/),
            name: text,
            /** null = da completare: la card mostra il segnaposto di ui.about */
            role: text.nullable(),
            place: text.nullable(),
            bio: text.nullable(),
            /** Illustrazione o foto. null = iniziali */
            avatar: picture(context).nullable(),
            linkedin: z.url().nullable(),
            todo,
          }),
        )
        .min(1),
    }),
});

const studios = defineCollection({
  loader: perLocale('studios'),
  schema: z.object({
    items: z
      .array(
        z.object({
          /** Deve corrispondere a site.studios[].id */
          id: z.enum(['nijmegen', 'roma']),
          city: text,
          label: text,
          description: text,
          /** Riga indirizzo mostrata nella card. null = non ancora confermato */
          addressLine: text.nullable(),
          todo,
        }),
      )
      .min(1),
  }),
});

const process = defineCollection({
  loader: perLocale('process'),
  schema: z.object({
    items: z.array(z.object({ title: text, description: text })).min(1),
  }),
});

const materials = defineCollection({
  loader: perLocale('materials'),
  schema: z.object({
    items: z
      .array(
        z.object({
          /** Deve corrispondere a una chiave di pricing.materials */
          id: z.enum(MATERIAL_IDS),
          name: text,
          tag: text,
          /** null = dato mancante: la card mostra ui.materials.pending */
          specs: text.nullable(),
          colors: z.array(z.object({ name: text, hex: z.string().regex(/^#[0-9a-f]{6}$/i) })),
          todo,
        }),
      )
      .length(MATERIAL_IDS.length),
  }),
});

const link = z.object({ href: text, label: text });

const ui = defineCollection({
  loader: perLocale('ui'),
  schema: (context) =>
    z.object({
      meta: z.object({ title: text, description: text, ogImageAlt: text }),
      a11y: z.object({
        skipLink: text,
        mainNav: text,
        openMenu: text,
        closeMenu: text,
        homeLink: text,
        footerNav: text,
        legalNav: text,
        languageSelector: text,
        newTab: text,
      }),
      nav: z.object({ items: z.array(link).min(1), cta: text }),
      hero: z.object({
        eyebrow: text,
        title: text,
        sub: text,
        primaryCta: text,
        secondaryCta: text,
        liveBadge: text,
        stats: z
          .array(
            z.object({
              /** Numero animato. null = usa solo `text` */
              value: z.number().nullable(),
              prefix: z.string(),
              suffix: z.string(),
              text: z.string(),
              label: text,
            }),
          )
          .min(1),
        images: z.array(picture(context)).length(3),
      }),
      marquee: z.object({ label: text, pause: text, play: text, items: z.array(text).min(3) }),
      products: z.object({ eyebrow: text, title: text, more: text, moreAbout: text }),
      projects: z.object({
        eyebrow: text,
        title: text,
        sub: text,
        previous: text,
        next: text,
        region: text,
      }),
      about: z.object({
        eyebrow: text,
        title: text,
        body: text,
        rolePending: text,
        bioPending: text,
        linkedin: text,
      }),
      studios: z.object({
        eyebrow: text,
        title: text,
        call: text,
        localTime: text,
        status: z.object({
          open: text,
          closedTomorrow: text,
          closedLaterToday: text,
          closedUntilDay: text,
          fallback: text,
        }),
        weekdays: z.record(z.enum(WEEKDAYS), text),
      }),
      process: z.object({ eyebrow: text, title: text, sub: text }),
      materials: z.object({
        eyebrow: text,
        title: text,
        sub: text,
        hint: text,
        lead: text,
        days: text,
        price: text,
        colors: text,
        pending: text,
      }),
      estimator: z.object({
        eyebrow: text,
        title: text,
        disclaimer: text,
        material: text,
        quantity: text,
        pieces: text,
        total: text,
        unit: text,
        perPiece: text,
        lead: text,
        days: text,
        onRequest: text,
        onRequestNote: text,
        cta: text,
        prefill: text,
        prefillOnRequest: text,
      }),
      contact: z.object({
        eyebrow: text,
        title: text,
        noteBefore: text,
        noteAfter: text,
        fields: z.object({
          company: text,
          email: text,
          material: text,
          materialUnsure: text,
          message: text,
          honeypot: text,
        }),
        selectedProduct: text,
        removeProduct: text,
        submit: text,
        sending: text,
        privacyBefore: text,
        privacyLink: text,
        errors: z.object({
          summary: text,
          required: text,
          email: text,
          tooShort: text,
        }),
        success: z.object({ title: text, body: text }),
        mailto: z.object({ title: text, body: text, subject: text }),
        failure: text,
      }),
      footer: z.object({
        tagline: text,
        studio: z.object({ title: text, links: z.array(link).min(1) }),
        contacts: z.object({ title: text, linkedin: text, instagram: text }),
        locations: z.object({ title: text }),
        copyright: text,
        kvkPending: text,
        kvk: text,
        legal: z.object({ privacy: text, cookies: text, terms: text, imprint: text }),
        languageSoon: text,
      }),
      cookie: z.object({
        label: text,
        text: text,
        textNonEssential: text,
        policy: text,
        ok: text,
        accept: text,
        reject: text,
      }),
      notFound: z.object({ title: text, heading: text, body: text, cta: text }),
      legal: z.object({ draftNotice: text, back: text, updated: text }),
    }),
});

const legal = defineCollection({
  // id = "<locale>/<pagina>", es. "it/privacy"
  loader: glob({ pattern: '*/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: text,
    description: text,
    updated: z.iso.date().nullable(),
  }),
});

export const collections = { products, projects, team, studios, process, materials, ui, legal };
