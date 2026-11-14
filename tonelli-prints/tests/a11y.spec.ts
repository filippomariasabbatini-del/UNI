import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PAGES = [
  '/',
  '/en/',
  '/nl/',
  '/privacy.html',
  '/en/privacy.html',
  '/cookies.html',
  '/terms.html',
  '/imprint.html',
  '/404.html',
];

/** Scorre tutta la pagina per far partire i reveal e caricare le immagini lazy prima dell'analisi. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
}

async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) =>
        `${violation.id}: ${violation.help} → ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
    );
}

for (const path of PAGES) {
  test(`@a11y ${path} senza violazioni serious o critical`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
}

test('@a11y home con menu mobile aperto', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'solo mobile');
  await page.goto('/');
  await page.getByRole('button', { name: 'Apri il menu' }).click();
  expect(await seriousViolations(page)).toEqual([]);
});

test('@a11y home con scheda materiale aperta ed errori del form visibili', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  await page.getByRole('button', { name: 'Mostra la scheda di PLA+ 2.0' }).click();
  await page.getByRole('button', { name: 'Invia richiesta' }).click();
  await page.waitForTimeout(500);
  expect(await seriousViolations(page)).toEqual([]);
});

test('@a11y i target interattivi sono almeno 44×44 px', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  const tooSmall = await page
    .locator('a[href], button, select, input:not([type="hidden"]), textarea')
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
          // WCAG 2.5.8: i link dentro una frase sono esclusi
          const inline = style.display === 'inline';
          const offscreen = rect.right < 0 || element.closest('.honeypot, .sr-only') !== null;
          return visible && !inline && !offscreen && (rect.width < 44 || rect.height < 44);
        })
        .map(
          (element) => `${element.tagName} "${(element.textContent ?? '').trim().slice(0, 40)}"`,
        ),
    );
  expect(tooSmall).toEqual([]);
});
