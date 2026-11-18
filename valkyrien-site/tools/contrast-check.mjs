// WCAG 2.2 contrast check for every token pair used in the UI.
// AA: 4.5:1 normal text, 3:1 large text (>= 24px or >= 18.66px bold) and UI components (1.4.11).
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, k, v]) => [k, v]));

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum, usage]
const pairs = [
  ['ink', 'paper', 4.5, 'body text'],
  ['ink', 'paper-alt', 4.5, 'hero text'],
  ['ink-muted', 'paper', 4.5, 'secondary text'],
  ['ink-muted', 'paper-alt', 4.5, 'hero lead / microcopy'],
  ['gold-strong', 'paper-alt', 4.5, 'eyebrow text'],
  ['gold-strong', 'paper', 4.5, 'eyebrow text'],
  ['ink', 'gold', 4.5, 'primary CTA label'],
  ['paper', 'ink', 4.5, 'CTA hover / closing band'],
  ['signal', 'paper', 4.5, 'links'],
  ['signal', 'paper-alt', 3, 'focus ring (1.4.11)'],
  ['gold', 'ink', 3, 'CTA fill on navy band (1.4.11)'],
];

let failed = 0;
for (const [fg, bg, min, usage] of pairs) {
  const r = ratio(tokens[fg], tokens[bg]);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  (min ${min})  ${fg} on ${bg}  - ${usage}`);
}
// Closing band body copy uses a literal value in footer.css
const band = ratio('#c9ced6', tokens.ink);
console.log(`${band >= 4.5 ? 'PASS' : 'FAIL'}  ${band.toFixed(2)}:1  (min 4.5)  #c9ced6 on ink  - closing band body`);
if (band < 4.5) failed++;

process.exit(failed ? 1 : 0);
