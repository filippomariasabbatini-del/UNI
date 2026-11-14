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

test.describe("scena 3D dell'hero", () => {
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
  const supportsWebGL = (): boolean =>
    document.createElement('canvas').getContext('webgl2') !== null;

  test('senza WebGL resta il logo statico e la scena non viene scaricata', async ({ page }) => {
    const errors: string[] = [];
    const scripts: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scripts.push(request.url());
    });
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
    await page.goto('/');
    const stage = page.locator('[data-logo-stage]');
    await expect(stage.getByRole('img', { name: 'Logo Tonelli Prints' })).toBeVisible();
    // Il modulo partirebbe a pagina ferma: gli diamo il tempo di provarci
    await page.waitForTimeout(1500);
    await expect(stage).not.toHaveAttribute('data-active');
    await expect(stage.locator('canvas')).toBeHidden();
    await expect(stage.locator('[data-stage-controls]')).toBeHidden();
    expect(scripts.filter((url) => url.includes('logo-stage'))).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('con WebGL: fasi, raggi X, materiali e pausa', async ({ page }) => {
    test.slow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(allowSoftwareWebGL);
    await page.goto('/');
    test.skip(!(await page.evaluate(supportsWebGL)), 'WebGL 2 non disponibile in questo browser');

    const stage = page.locator('[data-logo-stage]');
    await stage.scrollIntoViewIfNeeded();
    // Con GPU software la compilazione degli shader può richiedere parecchi secondi
    await expect(stage).toHaveAttribute('data-active', '', { timeout: 45_000 });
    await expect(stage.getByRole('img', { name: /Scena 3D interattiva/ })).toBeVisible();
    await expect(stage.locator('[data-stage-fallback]')).toHaveAttribute('aria-hidden', 'true');

    const steps = stage.getByRole('list', { name: 'Fasi della produzione' });
    await expect(steps.getByRole('button')).toHaveCount(4);
    await expect(steps.getByRole('button', { name: /Stampa base/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    const xray = stage.getByRole('switch', { name: 'Vista raggi X (NFC)' });
    await expect(xray).toBeDisabled();
    // La stampa avanza da sola
    await expect(stage.locator('[data-stage-layer]')).not.toHaveText('00', { timeout: 20_000 });

    // Salto alla fase 2: la timeline ci arriva e lo stepper la segue
    await steps.getByRole('button', { name: /Inserimento NFC/ }).click();
    await expect(steps.getByRole('button', { name: /Inserimento NFC/ })).toHaveAttribute(
      'aria-current',
      'step',
      { timeout: 20_000 },
    );
    await expect(stage.locator('[data-stage-layer]')).toHaveText('13');

    // Prodotto finito: si sbloccano i raggi X
    await steps.getByRole('button', { name: /Prodotto finito/ }).click();
    await expect(stage).toHaveAttribute('data-finished', '', { timeout: 30_000 });
    await expect(stage.locator('[data-stage-z]')).toHaveText('5.00');
    await expect(xray).toBeEnabled();
    await xray.click();
    await expect(xray).toHaveAttribute('aria-checked', 'true');
    await expect(stage.locator('[data-stage-nfc]')).toHaveAttribute('data-visible', '');

    // Cambio materiale: il nome arriva dal listino
    const petg = stage.getByRole('radio', { name: 'PETG' });
    await petg.click();
    await expect(petg).toHaveAttribute('aria-checked', 'true');
    await expect(stage.getByRole('radio', { name: 'Wood-PLA' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(stage.locator('[data-stage-material-name]')).toHaveText('PETG');

    await stage.getByRole('button', { name: "Metti in pausa l'animazione" }).click();
    await expect(stage.getByRole('button', { name: "Riavvia l'animazione" })).toBeVisible();

    // Tornando alla stampa il prodotto non è più "finito" e i raggi X si spengono
    await steps.getByRole('button', { name: /Stampa base/ }).click();
    await expect(stage).not.toHaveAttribute('data-finished', '', { timeout: 30_000 });
    await expect(xray).toBeDisabled();
    await expect(xray).toHaveAttribute('aria-checked', 'false');
    expect(errors).toEqual([]);
  });

  test('con movimento ridotto parte dal prodotto finito, fermo', async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(allowSoftwareWebGL);
    await page.goto('/');
    test.skip(!(await page.evaluate(supportsWebGL)), 'WebGL 2 non disponibile in questo browser');

    const stage = page.locator('[data-logo-stage]');
    // Con GPU software la compilazione degli shader può richiedere parecchi secondi
    await expect(stage).toHaveAttribute('data-active', '', { timeout: 45_000 });
    await expect(stage).toHaveAttribute('data-finished', '');
    await expect(stage.locator('[data-stage-layer]')).toHaveText('25');
    await expect(stage.locator('[data-stage-toggle]')).toBeHidden();
    await expect(stage.getByRole('switch', { name: 'Vista raggi X (NFC)' })).toBeEnabled();
    // Le fasi restano consultabili, a scatti
    await stage.getByRole('button', { name: /Inserimento NFC/ }).click();
    await expect(stage.locator('[data-stage-layer]')).toHaveText('13');
    await expect(stage).not.toHaveAttribute('data-finished', '');
  });
});

test.describe('lingue', () => {
  test("il selettore nell'header passa da italiano a inglese e ritorno", async ({ page }) => {
    await page.goto('/');
    const header = page.getByRole('banner');
    const language = header.getByRole('group', { name: 'Lingua' });
    await expect(language.getByRole('link', { name: 'Italiano' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await language.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toContainText('We print your brand');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://tonelliprints.com/en/',
    );
    await expect(
      header.getByRole('group', { name: 'Language' }).getByRole('link', { name: 'English' }),
    ).toHaveAttribute('aria-current', 'true');

    await header.getByRole('link', { name: 'Italiano' }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    await expect(page.locator('h1')).toContainText('Stampiamo il tuo brand');
  });

  test('il cambio lingua resta sulla stessa pagina e sulla stessa sezione', async ({ page }) => {
    await page.goto('/privacy.html');
    await page.getByRole('banner').getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/privacy\.html$/);
    await expect(page.locator('h1')).toHaveText('Privacy policy');

    await page.goto('/#materiali');
    await page.getByRole('banner').getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/#materiali$/);
    await expect(page.locator('#materiali')).toBeInViewport();
  });

  test("il selettore porta anche all'olandese", async ({ page }) => {
    await page.goto('/en/');
    await page.getByRole('banner').getByRole('link', { name: 'Nederlands' }).click();
    await expect(page).toHaveURL(/\/nl\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
    await expect(page.locator('h1')).toContainText('We printen jouw merk');
    await page.goto('/nl/terms.html');
    await expect(page.locator('h1')).toHaveText('Algemene voorwaarden');
  });

  test('la home inglese dichiara le alternative hreflang e non ha errori in console', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/en/');
    await expect(page).toHaveTitle(/Custom 3D printing/);
    const alternates = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) =>
        links.map((link) => `${link.getAttribute('hreflang')} ${link.getAttribute('href')}`),
      );
    expect(alternates).toEqual([
      'it https://tonelliprints.com/',
      'en https://tonelliprints.com/en/',
      'nl https://tonelliprints.com/nl/',
      'x-default https://tonelliprints.com/',
    ]);
    expect(errors).toEqual([]);
  });
});
