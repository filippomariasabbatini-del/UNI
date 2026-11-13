import { prefersReducedMotion } from './motion';

/**
 * Reveal allo scroll (opacity + translate). Nasconde solo gli elementi che al caricamento
 * sono sotto la piega: niente flash, e senza JS tutto resta visibile.
 */
export function initReveal(): void {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;

  const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal]')].filter(
    (element) => element.getBoundingClientRect().top > window.innerHeight,
  );
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );

  for (const element of targets) {
    const delay = element.dataset['reveal'];
    if (delay) element.style.setProperty('--reveal-delay', `${delay}ms`);
    element.classList.add('reveal-pending');
  }
  // La transizione si attiva al frame successivo, così lo stato iniziale non viene animato
  requestAnimationFrame(() => {
    for (const element of targets) {
      element.classList.add('reveal-run');
      observer.observe(element);
    }
  });
}
