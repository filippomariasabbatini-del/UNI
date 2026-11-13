/** Carosello a scroll nativo (scroll-snap): i bottoni scorrono di una card e si disabilitano agli estremi. */
export function initCarousels(): void {
  for (const carousel of document.querySelectorAll<HTMLElement>('[data-carousel]')) {
    const track = carousel.querySelector<HTMLElement>('[data-carousel-track]');
    const controls = carousel.querySelector<HTMLElement>('[data-carousel-controls]');
    const previous = carousel.querySelector<HTMLButtonElement>('[data-carousel-prev]');
    const next = carousel.querySelector<HTMLButtonElement>('[data-carousel-next]');
    if (!track || !controls || !previous || !next) continue;

    const step = (): number => {
      const item = track.querySelector<HTMLElement>('[data-carousel-item]');
      const gap = item?.parentElement
        ? parseFloat(getComputedStyle(item.parentElement).columnGap)
        : 0;
      return (item?.offsetWidth ?? track.clientWidth) + (Number.isFinite(gap) ? gap : 0);
    };

    const update = (): void => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      previous.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= maxScroll - 4;
    };

    let frame = 0;
    const scheduleUpdate = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    previous.addEventListener('click', () => track.scrollBy({ left: -step() }));
    next.addEventListener('click', () => track.scrollBy({ left: step() }));
    track.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    controls.hidden = false;
    update();
  }
}
