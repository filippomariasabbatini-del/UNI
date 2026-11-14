// Script della sola home page.
import { initCarousels } from './carousel';
import { initContactForm } from './contact-form';
import { initCounters } from './counters';
import { initEstimator } from './estimator';
import { initMarquee } from './marquee';
import { initMaterials } from './materials';
import { initStudioClocks } from './studio-clock';

initCounters();
initMarquee();
initCarousels();
initStudioClocks();
initMaterials();
initEstimator();
initContactForm();

// Scena di stampa dell'hero: modulo a parte, caricato a pagina ferma
const stage = document.querySelector<HTMLElement>('[data-print-stage]');
if (stage) {
  const start = (): void => {
    void import('./print-stage').then((module) => module.initPrintStage(stage));
  };
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2000 });
  else setTimeout(start, 300);
}
