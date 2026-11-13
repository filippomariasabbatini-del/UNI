/** Fascia scorrevole: bottone pausa/riavvio (WCAG 2.2.2, contenuto in movimento). */
export function initMarquee(): void {
  for (const marquee of document.querySelectorAll<HTMLElement>('[data-marquee]')) {
    const toggle = marquee.querySelector<HTMLButtonElement>('[data-marquee-toggle]');
    if (!toggle) continue;
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      const paused = marquee.toggleAttribute('data-paused');
      toggle.toggleAttribute('data-paused', paused);
      toggle.setAttribute(
        'aria-label',
        (paused ? toggle.dataset['labelPlay'] : toggle.dataset['labelPause']) ?? '',
      );
    });
  }
}
