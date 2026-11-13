/** Schede materiale: il bottone apre/chiude il pannello (una scheda aperta alla volta), Esc chiude. */
export function initMaterials(): void {
  const cards = [...document.querySelectorAll<HTMLElement>('[data-material]')];

  const setOpen = (card: HTMLElement, open: boolean): void => {
    card.toggleAttribute('data-open', open);
    card.querySelector('button[aria-controls]')?.setAttribute('aria-expanded', String(open));
  };

  for (const card of cards) {
    const toggle = card.querySelector<HTMLButtonElement>('button[aria-controls]');
    toggle?.addEventListener('click', () => {
      const open = !card.hasAttribute('data-open');
      for (const other of cards) setOpen(other, other === card && open);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !card.hasAttribute('data-open')) return;
      setOpen(card, false);
      toggle?.focus();
    });
    // Campioni colore: il valore arriva dai contenuti, lo stile si applica via CSSOM (CSP senza inline)
    for (const swatch of card.querySelectorAll<HTMLElement>('[data-swatch]')) {
      swatch.style.backgroundColor = swatch.dataset['swatch'] ?? '';
    }
  }
}
