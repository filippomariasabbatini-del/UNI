/** Cambio lingua: resta sulla stessa sezione della pagina (l'ancora non è nota in build). */
export function initLanguageSwitch(): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-language-switch] a')) {
    link.addEventListener('click', () => {
      if (location.hash) link.hash = location.hash;
    });
  }
}

/** Header: si compatta allo scroll e gestisce il menu mobile (aria-expanded, Esc, focus). */
export function initNav(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  const sentinel = document.querySelector('[data-scroll-sentinel]');
  if (sentinel) {
    new IntersectionObserver(([entry]) => {
      header.toggleAttribute('data-scrolled', entry ? !entry.isIntersecting : false);
    }).observe(sentinel);
  }

  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.getElementById('menu-mobile');
  if (!toggle || !menu) return;

  const isOpen = (): boolean => toggle.getAttribute('aria-expanded') === 'true';

  const setOpen = (open: boolean, restoreFocus = false): void => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute(
      'aria-label',
      (open ? toggle.dataset['labelClose'] : toggle.dataset['labelOpen']) ?? '',
    );
    menu.hidden = !open;
    header.toggleAttribute('data-menu-open', open);
    if (open) menu.querySelector<HTMLElement>('a')?.focus();
    else if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  menu.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) setOpen(false, true);
  });

  // Se il focus esce dall'header (Tab oltre l'ultimo link) il menu si chiude
  header.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (isOpen() && next instanceof Node && !header.contains(next)) setOpen(false);
  });

  // Passando al layout desktop il menu mobile non deve restare aperto
  window.matchMedia('(min-width: 64rem)').addEventListener('change', (event) => {
    if (event.matches && isOpen()) setOpen(false);
  });
}
