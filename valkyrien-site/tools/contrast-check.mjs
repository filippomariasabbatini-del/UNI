// WCAG 2.2 contrast check for every token pair used in the UI (inverted theme: navy surfaces, white type).
// AA: 4.5:1 normal text, 3:1 large text and UI component boundaries / states (1.4.11).
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, k, v]) => [k, v]));
const hex = (v) => tokens[v] ?? v;

const lum = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(hex(a)), lum(hex(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (a, b, t) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex(a).slice(i, i + 2), 16) * t + parseInt(hex(b).slice(i, i + 2), 16) * (1 - t)).toString(16).padStart(2, '0')).join('');

const pairs = [
  ['ink', 'paper', 4.5, 'body text'],
  ['ink', 'paper-alt', 4.5, 'hero / alternate sections'],
  ['ink-muted', 'paper', 4.5, 'secondary text'],
  ['ink-muted', 'paper-alt', 4.5, 'hero lead / microcopy'],
  ['gold-strong', 'paper', 4.5, 'eyebrow text'],
  ['gold-strong', 'paper-alt', 4.5, 'eyebrow text on hero'],
  ['on-gold', 'gold', 4.5, 'primary CTA label'],
  ['ink', 'ink-raised', 4.5, 'CTA hover label'],
  ['gold', 'ink-raised', 3, 'tactical ring on hover (1.4.11)'],
  ['gold', 'paper', 3, 'CTA fill vs page (1.4.11)'],
  ['signal', 'paper', 4.5, 'links'],
  ['signal', 'paper-alt', 3, 'focus ring (1.4.11)'],
  ['signal-strong', 'paper-alt', 4.5, 'ghost CTA hover label'],
  ['signal', 'paper-alt', 3, 'ghost CTA hover ring (1.4.11)'],
  ['gold-strong', 'paper', 3, 'card hover ring (1.4.11)'],
  ['ink', 'paper-alt', 3, 'ghost CTA border (1.4.11)'],
  ['on-gold', 'gold', 4.5, 'skip link'],
  // worst cases on layered backgrounds
  ['ink-muted', mix('gold', 'ink-raised', 0.16), 4.5, 'closing band body at gold-glow peak'],
  ['ink', mix('paper-alt', '#ffffff', 0.8), 4.5, 'hero text over 80% overlay on a white video frame'],
  ['ink-muted', mix('paper-alt', '#ffffff', 0.8), 4.5, 'hero lead over 80% overlay on a white video frame'],
];

let failed = 0;
for (const [fg, bg, min, usage] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  (min ${min})  ${fg} on ${bg}  - ${usage}`);
}
process.exit(failed ? 1 : 0);
