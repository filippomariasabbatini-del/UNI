import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, 'src');

/**
 * Build-time HTML includes: <!-- @include partials/header.html -->
 * Optional key=value pairs replace {{key}} tokens inside the partial.
 */
function htmlIncludes() {
  const re = /<!--\s*@include\s+(\S+)((?:\s+\w+="[^"]*")*)\s*-->/g;
  const render = (html) =>
    html.replace(re, (_, file, rawArgs) => {
      let out = readFileSync(resolve(root, file), 'utf8');
      for (const [, k, v] of rawArgs.matchAll(/(\w+)="([^"]*)"/g)) {
        out = out.replaceAll(`{{${k}}}`, v);
        // current="engage" marks the matching nav item (data-nav="engage") as the current page
        if (k === 'current') out = out.replaceAll(`data-nav="${v}"`, `data-nav="${v}" aria-current="page"`);
      }
      return render(out).replace(/\{\{\w+\}\}/g, '');
    });
  return {
    name: 'html-includes',
    transformIndexHtml: { order: 'pre', handler: render },
    handleHotUpdate({ file, server }) {
      if (file.includes('/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  root,
  publicDir: resolve(import.meta.dirname, 'public'),
  plugins: [htmlIncludes(), tailwindcss()],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: resolve(root, 'index.html'),
        whoWeAre: resolve(root, 'who-we-are/index.html'),
        compliance: resolve(root, 'compliance/index.html'),
        engage: resolve(root, 'engage/index.html'),
      },
    },
  },
});
