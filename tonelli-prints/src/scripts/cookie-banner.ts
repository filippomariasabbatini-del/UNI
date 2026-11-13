const STORAGE_KEY = 'tp-consent';
export type Consent = 'essential' | 'all';

function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'essential' || value === 'all' ? value : null;
  } catch {
    return null;
  }
}

function saveConsent(value: Consent): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage non disponibile (navigazione privata): la scelta vale solo per questa pagina
  }
}

/**
 * Banner cookie: senza una scelta salvata i non essenziali restano rifiutati.
 * Emette l'evento `tp:consent` per eventuali script futuri che richiedono il consenso.
 */
export function initCookieBanner(): void {
  const banner = document.querySelector<HTMLElement>('[data-cookie-banner]');
  if (!banner || readConsent()) return;
  banner.hidden = false;
  banner.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const choice =
      event.target.closest<HTMLElement>('[data-cookie-choice]')?.dataset['cookieChoice'];
    if (choice !== 'essential' && choice !== 'all') return;
    saveConsent(choice);
    banner.hidden = true;
    document.dispatchEvent(new CustomEvent<Consent>('tp:consent', { detail: choice }));
  });
}
