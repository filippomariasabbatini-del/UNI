import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test.describe('home', () => {
  test('carica con titolo, un solo h1 e nessun errore in console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await expect(page).toHaveTitle(/Tonelli Prints/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Stampiamo il tuo brand');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://tonelliprints.com/',
    );
    expect(errors).toEqual([]);
  });

  test('espone i dati strutturati Organization e LocalBusiness', async ({ page }) => {
    await page.goto('/');
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const nodes = JSON.parse(raw ?? '[]') as { '@type': string }[];
    expect(nodes.map((node) => node['@type'])).toEqual([
      'Organization',
      'LocalBusiness',
      'LocalBusiness',
    ]);
  });

  test('la gerarchia dei titoli non salta livelli', async ({ page }) => {
    await page.goto('/');
    const levels = await page
      .locator('h1, h2, h3, h4, h5, h6')
      .evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
    levels.reduce((previous, level) => {
      expect(level - previous).toBeLessThanOrEqual(1);
      return level;
    }, 0);
  });
});

test.describe('navigazione', () => {
  test('desktop: i link della navbar portano alle sezioni', async ({ page, isMobile }) => {
    test.skip(isMobile, 'solo desktop');
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Navigazione principale' })
      .getByRole('link', { name: 'Materiali' })
      .click();
    await expect(page).toHaveURL(/#materiali$/);
    await expect(page.locator('#materiali')).toBeInViewport();
  });

  test('mobile: il menu si apre, si chiude con Esc e restituisce il focus', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'solo mobile');
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Apri il menu' });
    const menu = page.locator('#menu-mobile');

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-controls', 'menu-mobile');
    await expect(menu).toBeHidden();

    await toggle.click();
    await expect(menu).toBeVisible();
    const openToggle = page.getByRole('button', { name: 'Chiudi il menu' });
    await expect(openToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.getByRole('link').first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();

    await toggle.click();
    await menu.getByRole('link', { name: 'Processo' }).click();
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(/#processo$/);
  });

  test('lo skip link porta al contenuto', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Vai al contenuto' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page).toHaveURL(/#contenuto$/);
  });
});

test.describe('configuratore', () => {
  test('mostra la stima di default e si aggiorna', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#stima');
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator('[data-estimator-total]')).toHaveText(/449/);
    await expect(section.locator('[data-estimator-unit]')).toHaveText(/2,99/);
    await expect(section.locator('[data-estimator-lead]')).toHaveText('5 giorni');

    await section.getByLabel('Quantità').fill('100');
    await expect(section.locator('[data-estimator-total]')).toHaveText(/340/);
    await expect(section.locator('[data-estimator-unit]')).toHaveText(/3,40/);
    await expect(section.locator('[data-estimator-lead]')).toHaveText('4 giorni');

    await section.getByLabel('Materiale').selectOption({ label: 'PETG' });
    await expect(section.locator('[data-estimator-total]')).toHaveText('Su richiesta');
  });

  test('"Conferma questa produzione" precompila il form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Conferma questa produzione' }).click();
    const form = page.locator('[data-contact-form]');
    await expect(form.getByLabel('Materiale')).toHaveValue('PLA+ 2.0');
    await expect(form.getByLabel('Che cosa vuoi realizzare?')).toHaveValue(
      /150 pezzi in PLA\+ 2\.0.*449/,
    );
  });
});

test.describe('form contatti', () => {
  test('valida i campi con messaggi accessibili', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('[data-contact-form]');
    await form.scrollIntoViewIfNeeded();
    await form.getByRole('button', { name: 'Invia richiesta' }).click();

    const company = form.getByLabel('Azienda');
    await expect(company).toBeFocused();
    await expect(company).toHaveAttribute('aria-invalid', 'true');
    await expect(company).toHaveAttribute('aria-describedby', 'azienda-error');
    await expect(page.locator('#azienda-error')).toHaveText('Questo campo ci serve.');
    await expect(form.getByRole('alert')).toHaveText('Controlla i campi evidenziati.');

    const email = form.getByLabel('Email');
    await email.fill('non-una-email');
    await email.blur();
    await expect(page.locator('#email-error')).toContainText('indirizzo email valido');

    await email.fill('nome@azienda.it');
    await expect(email).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#email-error')).toBeHidden();
  });

  test('"Scopri di più" preseleziona il prodotto', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Scopri di più su Kit dipendenti' }).click();
    const chip = page.locator('[data-selected-product]');
    await expect(chip).toContainText('Ti interessa: Kit dipendenti');
    await expect(page.locator('[data-product-input]')).toHaveValue('Kit dipendenti');
    await chip.getByRole('button').click();
    await expect(chip).toBeHidden();
  });

  test('il campo trappola fa scartare l’invio senza errori', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('[data-contact-form]');
    await form.getByLabel('Azienda').fill('Hotel Esempio');
    await form.getByLabel('Email').fill('nome@azienda.it');
    await form.getByLabel('Che cosa vuoi realizzare?').fill('Cento portachiavi NFC con il logo.');
    await form.locator('input[name="_gotcha"]').evaluate((input: HTMLInputElement) => {
      input.value = 'spam';
    });
    await form.getByRole('button', { name: 'Invia richiesta' }).click();
    await expect(page.locator('[data-form-success]')).toBeVisible();
    await expect(page.locator('[data-form-success]')).toBeFocused();
  });
});

test.describe('sezioni interattive', () => {
  test('le schede materiale si aprono con il bottone e si chiudono con Esc', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Mostra la scheda di PLA+ 2.0' });
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator('#scheda-pla-plus');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Bio-based · 20+ colori · opaco');
    await expect(panel).toContainText('3,40');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('gli studi mostrano ora locale e stato', async ({ page }) => {
    await page.goto('/');
    const clocks = page.locator('[data-studio-clock]');
    await expect(clocks).toHaveCount(2);
    await expect(clocks.first().locator('[data-studio-time]')).toHaveText(/^\d{2}:\d{2}$/);
    await expect(clocks.first().locator('[data-studio-status]')).not.toBeEmpty();
  });

  test('il carosello dei progetti scorre con i bottoni', async ({ page }) => {
    await page.goto('/');
    const next = page.getByRole('button', { name: 'Progetto successivo' });
    const previous = page.getByRole('button', { name: 'Progetto precedente' });
    await next.scrollIntoViewIfNeeded();
    await expect(previous).toBeDisabled();
    await next.click();
    await expect(previous).toBeEnabled();
  });

  test('il banner cookie si chiude e non ricompare', async ({ page }) => {
    await page.goto('/');
    const banner = page.locator('[data-cookie-banner]');
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Ok, capito' }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(banner).toBeHidden();
  });
});

test.describe('altre pagine', () => {
  for (const [path, heading] of [
    ['/privacy.html', 'Informativa sulla privacy'],
    ['/cookies.html', 'Cookie policy'],
    ['/terms.html', 'Termini e condizioni'],
    ['/imprint.html', 'Note legali'],
  ] as const) {
    test(`${path} si apre e torna alla home`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      await expect(page.getByText('[DA COMPILARE').first()).toBeVisible();
      await page.getByRole('link', { name: 'Torna alla home', exact: true }).click();
      await expect(page.locator('h1')).toContainText('Stampiamo il tuo brand');
    });
  }

  test('404 per un percorso inesistente', async ({ page }) => {
    const response = await page.goto('/pagina-che-non-esiste');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "Questa pagina non l'abbiamo stampata.",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await page.getByRole('link', { name: 'Torna alla home', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('robots.txt e sitemap sono serviti', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toContain('Sitemap: https://tonelliprints.com/sitemap-index.xml');
    const sitemap = await request.get('/sitemap-0.xml');
    expect(await sitemap.text()).toContain('https://tonelliprints.com/privacy.html');
  });
});

test.describe('sicurezza', () => {
  test('la Content-Security-Policy generata non blocca nessuna risorsa della home', async ({
    page,
  }) => {
    const headersFile = readFileSync(new URL('../dist/_headers', import.meta.url), 'utf8');
    const csp = /Content-Security-Policy: (.+)/.exec(headersFile)?.[1];
    expect(csp).toBeTruthy();
    expect(csp).not.toContain('unsafe-inline');
    // In locale il sito gira su http: la direttiva che forza https va tolta solo per il test
    const policy = (csp ?? '').replace('; upgrade-insecure-requests', '');

    const violations: string[] = [];
    page.on('console', (message) => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
    });
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch();
      return route.fulfill({
        response,
        headers: { ...response.headers(), 'content-security-policy': policy },
      });
    });

    await page.goto('/');
    await expect(page.locator('[data-studio-time]').first()).toHaveText(/^\d{2}:\d{2}$/);
    await page.locator('#stima').getByLabel('Quantità').fill('500');
    await page.getByRole('button', { name: 'Mostra la scheda di PLA+ 2.0' }).click();
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    expect(violations).toEqual([]);
  });
});

test.describe("scena di stampa dell'hero", () => {
  /** In CI la GPU è software: il sito la rifiuta di proposito. Qui togliamo il veto per provare la scena. */
  const allowSoftwareWebGL = (): void => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      attributes?: Record<string, unknown>,
    ) {
      return original.call(this, type, { ...attributes, failIfMajorPerformanceCaveat: false });
    } as typeof original;
  };

  test('senza WebGL resta la foto', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
    await page.goto('/');
    const stage = page.locator('[data-print-stage]');
    await expect(stage.getByRole('img', { name: /Portachiavi stampati in 3D/ })).toBeVisible();
    // Il modulo parte a pagina ferma: gli diamo il tempo di provarci
    await page.waitForTimeout(1500);
    await expect(stage).not.toHaveAttribute('data-active');
    await expect(stage.locator('canvas')).toBeHidden();
    await expect(stage.locator('[data-stage-toggle]')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('con WebGL parte, si mette in pausa e riparte', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(allowSoftwareWebGL);
    await page.goto('/');
    const supported = await page.evaluate(
      () => document.createElement('canvas').getContext('webgl') !== null,
    );
    test.skip(!supported, 'WebGL non disponibile in questo browser');

    const stage = page.locator('[data-print-stage]');
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-active', '');
    await expect(stage.getByRole('img', { name: /stampante 3D/ })).toBeVisible();
    await expect(stage.locator('[data-stage-fallback]')).toHaveAttribute('aria-hidden', 'true');
    await expect(stage.locator('[data-stage-name]')).toHaveText('Portachiavi NFC');
    // Il nome del filamento arriva dal listino materiali
    await expect(stage.locator('[data-stage-material]')).toHaveText('PLA+ 2.0');

    const layer = stage.locator('[data-stage-layer]');
    await expect(layer).not.toHaveText('000');
    await stage.getByRole('button', { name: "Metti in pausa l'animazione di stampa" }).click();
    const frozen = await layer.textContent();
    await page.waitForTimeout(400);
    await expect(layer).toHaveText(frozen ?? '');

    await stage.getByRole('button', { name: "Riavvia l'animazione di stampa" }).click();
    await expect(layer).not.toHaveText(frozen ?? '');
    expect(errors).toEqual([]);
  });

  test('con movimento ridotto mostra il pezzo finito, fermo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(allowSoftwareWebGL);
    await page.goto('/');
    const supported = await page.evaluate(
      () => document.createElement('canvas').getContext('webgl') !== null,
    );
    test.skip(!supported, 'WebGL non disponibile in questo browser');

    const stage = page.locator('[data-print-stage]');
    await expect(stage).toHaveAttribute('data-active', '');
    await expect(stage.locator('[data-stage-status]')).toHaveText('Pronto');
    await expect(stage.locator('[data-stage-layer]')).toHaveText('300');
    await expect(stage.locator('[data-stage-toggle]')).toBeHidden();
  });
});
