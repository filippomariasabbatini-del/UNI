import { prefersReducedMotion, tween } from './motion';

/** Contatori animati: [data-count-to="8"] conta da 0 al valore quando entra nello schermo. */
export function initCounters(): void {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        observer.unobserve(entry.target);
        const element = entry.target;
        const target = Number(element.dataset['countTo']);
        if (!Number.isFinite(target)) continue;
        tween(0, target, 1400, (value) => {
          element.textContent = String(Math.round(value));
        });
      }
    },
    { threshold: 0.6 },
  );
  for (const element of document.querySelectorAll('[data-count-to]')) observer.observe(element);
}
