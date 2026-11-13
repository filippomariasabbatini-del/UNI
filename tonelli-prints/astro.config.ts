import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';
import { enabledLocales, site } from './src/config/site';
import { securityHeaders } from './src/integrations/security-headers';
import { INTL_LOCALE } from './src/lib/i18n';

export default defineConfig({
  site: site.url,
  output: 'static',
  build: {
    // 'preserve': privacy.astro → /privacy.html, [locale]/index.astro → /en/index.html
    format: 'preserve',
    // CSS e JS sempre in file esterni: la CSP non ha bisogno di 'unsafe-inline'
    inlineStylesheets: 'never',
  },
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
  },
  env: {
    schema: {
      PUBLIC_FORM_ENDPOINT: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
        url: true,
      }),
    },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      // Con build.format 'preserve' le pagine sono file .html: la sitemap deve usare gli stessi URL dei canonical
      serialize: (item) => {
        const url = new URL(item.url);
        const path = url.pathname.replace(/^\/|\/$/g, '');
        if (path === '') return item;
        const isLocaleHome = enabledLocales.some((code) => code === path);
        url.pathname = isLocaleHome ? `/${path}/` : `/${path.replace(/\.html$/, '')}.html`;
        return { ...item, url: url.href };
      },
      ...(enabledLocales.length > 1
        ? {
            i18n: {
              defaultLocale: site.defaultLocale,
              locales: Object.fromEntries(enabledLocales.map((code) => [code, INTL_LOCALE[code]])),
            },
          }
        : {}),
    }),
    securityHeaders({ analyticsScriptUrl: site.analytics.scriptUrl }),
  ],
});
