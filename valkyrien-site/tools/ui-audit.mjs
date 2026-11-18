// Browser audit (Playwright + axe-core) over every locale page, desktop and phone.
// Checks: axe WCAG 2.2 A/AA, Tab order (skip link first), visible focus ring, focus not obscured
// by the sticky header or the vest chip, touch target size on coarse pointers, horizontal overflow.
// Usage: npm run build && npx vite preview --port 4173 & npm run audit:ui
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Playwright is provided by the environment (global install), loaded through require resolution
const { chromium, devices } = require('playwright');
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.AUDIT_BASE || 'http://localhost:4173';
const LOCALES = ['', '/it', '/fr', '/es', '/de'];
const PAGES = ['/', '/who-we-are/', '/compliance/', '/engage/'];
const MIN_TAP = 44;

const results = [];
const add = (sev, page, rule, detail) => results.push({ sev, page, rule, detail });

const browser = await chromium.launch();
for (const [label, opt] of [
  ['desktop', { viewport: { width: 1280, height: 800 } }],
  ['phone', { ...devices['iPhone 13'] }],
]) {
  const ctx = await browser.newContext({ ...opt, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('vk-intro', '1'); } catch {} });
  const page = await ctx.newPage();
  for (const l of LOCALES) for (const p of PAGES) {
    const url = `${BASE}${l}${p}`;
    const tag = `${label} ${l || '/en'}${p}`;
    await page.goto(url, { waitUntil: 'networkidle' });

    // 1. axe-core
    await page.addScriptTag({ content: AXE });
    const axe = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations
      .map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, target: v.nodes[0]?.target.join(' ') })));
    for (const v of axe) add(v.impact === 'critical' || v.impact === 'serious' ? 'error' : 'warn', tag, `axe:${v.id}`, `${v.n} node(s), e.g. ${v.target}`);

    // 2. overflow
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ov > 0) add('error', tag, 'overflow-x', `${ov}px`);

    // 3. touch targets (phone only): interactive elements outside running text
    if (label === 'phone') {
      const small = await page.evaluate((MIN) => [...document.querySelectorAll('a, button, summary, input, textarea, select')]
        .filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          return r.width && r.height && cs.visibility !== 'hidden' && !el.closest('p, address, .sr-only') && el.className !== 'skip-link' && (r.height < MIN || r.width < MIN); })
        .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`), MIN_TAP);
      for (const s of [...new Set(small)]) add('warn', tag, 'tap-size', s);
    }

    // 4. keyboard: first Tab = skip link; every focus stop shows a ring and is not hidden under header/vest
    if (p === '/' || p === '/compliance/') {
      await page.keyboard.press('Tab');
      const first = await page.evaluate(() => document.activeElement?.className);
      if (first !== 'skip-link') add('error', tag, 'skip-link-first', `first Tab reached .${first}`);
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(() => {
          const el = document.activeElement; if (!el || el === document.body) return null;
          const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
          const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || /inset|px/.test(cs.boxShadow) && cs.boxShadow !== 'none';
          const hdr = document.querySelector('.site-header').getBoundingClientRect();
          const vest = document.querySelector('[data-vest]');
          const vr = vest && getComputedStyle(vest).opacity !== '0' ? vest.getBoundingClientRect() : null;
          const covered = (a) => a && r.left >= a.left && r.right <= a.right && r.top >= a.top && r.bottom <= a.bottom;
          const underHeader = !el.closest('.site-header') && r.top < hdr.bottom && r.bottom <= hdr.bottom;
          return { name: `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} "${(el.textContent || '').trim().slice(0, 24)}"`, ring, underHeader, underVest: covered(vr) };
        });
        if (!f) break;
        if (!f.ring) add('error', tag, 'focus-ring', f.name);
        if (f.underHeader) add('error', tag, 'focus-obscured', `${f.name} under sticky header`);
        if (f.underVest) add('error', tag, 'focus-obscured', `${f.name} under vest chip`);
      }
    }
  }
  await ctx.close();
}
await browser.close();

const order = { error: 0, warn: 1 };
results.sort((a, b) => order[a.sev] - order[b.sev] || a.rule.localeCompare(b.rule));
const grouped = new Map();
for (const r of results) {
  const k = `${r.sev}|${r.rule}|${r.detail}`;
  grouped.set(k, [...(grouped.get(k) || []), r.page]);
}
for (const [k, pages] of grouped) {
  const [sev, rule, detail] = k.split('|');
  console.log(`${sev.toUpperCase().padEnd(5)} ${rule.padEnd(22)} ${detail}  [${pages.length} page(s): ${pages.slice(0, 3).join(', ')}${pages.length > 3 ? ', …' : ''}]`);
}
const errors = results.filter((r) => r.sev === 'error').length;
console.log(`\n${errors} error(s), ${results.length - errors} warning(s)`);
process.exit(errors ? 1 : 0);
