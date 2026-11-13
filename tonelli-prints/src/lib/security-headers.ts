export interface HeadersInput {
  /** URL assoluto dell'endpoint del form, oppure null se il form usa mailto: */
  formEndpoint: string | null;
  /** URL dello script analytics cookieless, oppure null */
  analyticsScriptUrl: string | null;
}

function origin(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    throw new Error(`URL non valido nella configurazione degli header: ${url}`);
  }
}

/** Content-Security-Policy coerente con ciò che il sito carica davvero. Nessun 'unsafe-inline'. */
export function contentSecurityPolicy({ formEndpoint, analyticsScriptUrl }: HeadersInput): string {
  const form = origin(formEndpoint);
  const analytics = origin(analyticsScriptUrl);
  const list = (...sources: (string | null)[]): string =>
    sources.filter((source): source is string => source !== null).join(' ');

  const directives: Record<string, string> = {
    'default-src': "'none'",
    'script-src': list("'self'", analytics),
    'style-src': "'self'",
    'img-src': "'self'",
    'font-src': "'self'",
    'connect-src': list("'self'", form, analytics),
    // Senza endpoint il form senza JS invia a mailto:
    'form-action': list("'self'", form ?? 'mailto:'),
    'manifest-src': "'self'",
    'base-uri': "'self'",
    'frame-ancestors': "'none'",
    'object-src': "'none'",
    'upgrade-insecure-requests': '',
  };
  return Object.entries(directives)
    .map(([name, value]) => (value ? `${name} ${value}` : name))
    .join('; ');
}

/** Contenuto del file `_headers` di Netlify. */
export function netlifyHeadersFile(input: HeadersInput): string {
  const global: Record<string, string> = {
    'Content-Security-Policy': contentSecurityPolicy(input),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
  const block = (path: string, headers: Record<string, string>): string =>
    [path, ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`)].join('\n');

  return [
    '# Generato a ogni build da src/integrations/security-headers.ts. Non modificare a mano.',
    block('/*', global),
    // Asset con hash nel nome: immutabili per un anno. L'HTML resta al default Netlify (max-age=0, must-revalidate).
    block('/_astro/*', { 'Cache-Control': 'public, max-age=31536000, immutable' }),
    '',
  ].join('\n');
}
