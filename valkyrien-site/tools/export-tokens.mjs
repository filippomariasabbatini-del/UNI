// Export src/styles/tokens.css as W3C Design Tokens (DTCG) JSON for the Figma Variables import.
// Usage: npm run tokens  ->  design-tokens/valkyrien.tokens.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const decl = (prefix) => [...css.matchAll(new RegExp(`--${prefix}-([\\w-]+):\\s*([^;]+);`, 'g'))].map(([, k, v]) => [k, v.trim()]);
const bezier = (v) => (v.match(/cubic-bezier\(([^)]+)\)/)?.[1].split(',').map(Number)) ?? null;

const tokens = {
  color: Object.fromEntries(decl('color').map(([k, v]) => [k, { $type: 'color', $value: v }])),
  gradient: Object.fromEntries(decl('gradient').map(([k, v]) => [k, { $type: 'string', $value: v.replace(/\s+/g, ' '), $description: 'CSS gradient; rebuild as a Figma paint style' }])),
  font: Object.fromEntries(decl('font').map(([k, v]) => [k, { $type: 'fontFamily', $value: v.split(',').map((f) => f.trim().replace(/'/g, '')) }])),
  duration: Object.fromEntries(decl('duration').map(([k, v]) => [k, { $type: 'duration', $value: v }])),
  easing: Object.fromEntries(decl('ease').map(([k, v]) => [k, { $type: 'cubicBezier', $value: bezier(v) }])),
  radius: Object.fromEntries(decl('radius').map(([k, v]) => [k, { $type: 'dimension', $value: v }])),
  stroke: { icon: { $type: 'dimension', $value: '1.5px' } },
};

mkdirSync(new URL('../design-tokens/', import.meta.url), { recursive: true });
writeFileSync(new URL('../design-tokens/valkyrien.tokens.json', import.meta.url), JSON.stringify(tokens, null, 2) + '\n');
console.log(Object.entries(tokens).map(([g, t]) => `${g}: ${Object.keys(t).length}`).join(' | '));
