import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { generate } from './tools/i18n.mjs';

const root = resolve(import.meta.dirname, 'src');

/** Regenerates localised pages when templates or locale files change (dev). */
function i18nPages() {
  return {
    name: 'i18n-pages',
    configureServer(server) {
      server.watcher.add([resolve(root, 'templates'), resolve(root, 'locales')]);
      server.watcher.on('change', (file) => {
        if (!file.includes('/templates/') && !file.includes('/locales/')) return;
        try {
          generate(root);
          server.ws.send({ type: 'full-reload' });
        } catch (e) {
          server.config.logger.error(e.message);
        }
      });
    },
  };
}

export default defineConfig(() => ({
  root,
  publicDir: resolve(import.meta.dirname, 'public'),
  plugins: [i18nPages(), tailwindcss()],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: generate(root) },
  },
}));
