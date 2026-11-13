import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import type { AstroIntegration } from 'astro';
import { netlifyHeadersFile } from '../lib/security-headers';

interface Options {
  analyticsScriptUrl: string | null;
}

/** Scrive dist/_headers (Netlify) a fine build, con la CSP calcolata dalla configurazione reale. */
export function securityHeaders({ analyticsScriptUrl }: Options): AstroIntegration {
  return {
    name: 'tonelli:security-headers',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        // In locale la variabile sta in .env (Astro la legge via Vite, non la mette in process.env).
        if (process.env['PUBLIC_FORM_ENDPOINT'] === undefined && existsSync('.env')) {
          process.loadEnvFile('.env');
        }
        const formEndpoint = process.env['PUBLIC_FORM_ENDPOINT']?.trim() || null;
        await writeFile(
          new URL('_headers', dir),
          netlifyHeadersFile({ formEndpoint, analyticsScriptUrl }),
        );
        logger.info(`_headers scritto (form: ${formEndpoint ?? 'mailto'})`);
      },
    },
  };
}
