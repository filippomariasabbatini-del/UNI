// Script della sola home page.
import { initCarousels } from './carousel';
import { initContactForm } from './contact-form';
import { initCounters } from './counters';
import { initEstimator } from './estimator';
import { initMarquee } from './marquee';
import { initMaterials } from './materials';
import { initStudioClocks } from './studio-clock';
import { hasHardwareWebGL } from './webgl';

initCounters();
initMarquee();
initCarousels();
initStudioClocks();
initMaterials();
initEstimator();
initContactForm();

// Scena 3D dell'hero: three.js e GSAP stanno in un modulo a parte, scaricato solo dove WebGL
// ha l'accelerazione hardware e solo a pagina ferma
const logoStage = document.querySelector<HTMLElement>('[data-logo-stage]');
if (logoStage && hasHardwareWebGL()) {
  const start = (): void => {
    void import('./logo-stage/index').then((module) => module.initLogoStage(logoStage));
  };
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2000 });
  else setTimeout(start, 300);
}
