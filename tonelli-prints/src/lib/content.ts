import { getEntry, type CollectionEntry } from 'astro:content';
import type { Locale } from '../config/site';

type LocalizedCollection =
  'ui' | 'products' | 'projects' | 'team' | 'studios' | 'process' | 'materials';

/** Contenuto di una collection per una lingua. Lancia un errore se il file <locale>.json non esiste. */
export async function getContent<C extends LocalizedCollection>(
  collection: C,
  locale: Locale,
): Promise<CollectionEntry<C>['data']> {
  const entry = await getEntry(collection, locale);
  if (!entry) {
    throw new Error(
      `Contenuto mancante: src/content/${collection}/${locale}.json (lingua abilitata in site.ts)`,
    );
  }
  return entry.data;
}

export type Ui = CollectionEntry<'ui'>['data'];
export type Product = CollectionEntry<'products'>['data']['items'][number];
export type Project = CollectionEntry<'projects'>['data']['items'][number];
export type TeamMember = CollectionEntry<'team'>['data']['items'][number];
export type StudioContent = CollectionEntry<'studios'>['data']['items'][number];
export type Material = CollectionEntry<'materials'>['data']['items'][number];
