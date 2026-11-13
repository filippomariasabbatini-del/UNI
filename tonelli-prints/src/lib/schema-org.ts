import { WEEKDAYS, type Weekday } from '../config/constants';
import { site, type Studio } from '../config/site';

export type JsonLdNode = Record<string, unknown>;

const ORGANIZATION_ID = `${site.url}/#organization`;

const SCHEMA_DAY: Record<Weekday, string> = {
  mon: 'https://schema.org/Monday',
  tue: 'https://schema.org/Tuesday',
  wed: 'https://schema.org/Wednesday',
  thu: 'https://schema.org/Thursday',
  fri: 'https://schema.org/Friday',
  sat: 'https://schema.org/Saturday',
  sun: 'https://schema.org/Sunday',
};

export function organizationSchema(input: { description: string; logoUrl: string }): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: site.name,
    url: site.url,
    logo: input.logoUrl,
    description: input.description,
    email: site.email,
    sameAs: [site.social.linkedin, site.social.instagram],
    contactPoint: site.studios.map((studio) => ({
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: studio.phone,
      email: site.email,
      areaServed: studio.countryCode,
    })),
  };
}

function openingHours(studio: Studio): JsonLdNode[] {
  return WEEKDAYS.flatMap((day) => {
    const hours = studio.hours.week[day];
    if (!hours) return [];
    return [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: SCHEMA_DAY[day],
        opens: hours[0],
        closes: hours[1],
      },
    ];
  });
}

/** Un LocalBusiness per sede. Indirizzo e orari compaiono solo se confermati in site.ts. */
export function localBusinessSchema(
  studio: Studio,
  input: { city: string; description: string; imageUrl: string },
): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${site.url}/#studio-${studio.id}`,
    name: `${site.name} ${input.city}`,
    description: input.description,
    url: site.url,
    image: input.imageUrl,
    telephone: studio.phone,
    email: site.email,
    parentOrganization: { '@id': ORGANIZATION_ID },
    address: {
      '@type': 'PostalAddress',
      addressLocality: input.city,
      addressCountry: studio.countryCode,
      ...(studio.streetAddress ? { streetAddress: studio.streetAddress } : {}),
      ...(studio.postalCode ? { postalCode: studio.postalCode } : {}),
    },
    ...(studio.hours.confirmed ? { openingHoursSpecification: openingHours(studio) } : {}),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** JSON sicuro dentro <script>: "<" non può chiudere il tag. */
export function serializeJsonLd(data: JsonLdNode | JsonLdNode[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
