// Verifica i rapporti di contrasto WCAG 2.2 AA dei token colore in src/styles/tokens.css.
// Esce con codice 1 (e quindi ferma `pnpm build`) se una coppia non passa.
import { readFileSync } from 'node:fs';

const TEXT = 4.5; // testo normale
const UI = 3; // testo grande, bordi dei campi, componenti dell'interfaccia

/** [primo piano, sfondo, soglia, descrizione] */
const PAIRS = [
  ['fg', 'bg', TEXT, 'testo su sfondo'],
  ['fg', 'surface', TEXT, 'testo su superficie'],
  ['fg', 'raised', TEXT, 'testo su card'],
  ['muted', 'bg', TEXT, 'testo secondario su sfondo'],
  ['muted', 'surface', TEXT, 'testo secondario su superficie'],
  ['muted', 'raised', TEXT, 'testo secondario su card'],
  ['accent-text', 'bg', TEXT, 'link e eyebrow su sfondo'],
  ['accent-text', 'surface', TEXT, 'link e eyebrow su superficie'],
  ['accent-text', 'raised', TEXT, 'link e eyebrow su card'],
  ['on-accent', 'accent', TEXT, 'testo del bottone primario'],
  ['on-accent', 'accent-hover', TEXT, 'testo del bottone primario (hover)'],
  ['danger', 'bg', TEXT, 'messaggio di errore su sfondo'],
  ['danger', 'surface', TEXT, 'messaggio di errore su superficie'],
  ['danger', 'raised', TEXT, 'messaggio di errore su card'],
  ['accent', 'bg', UI, 'bottone primario su sfondo'],
  ['accent', 'surface', UI, 'bottone primario su superficie'],
  ['field', 'bg', UI, 'bordo dei campi su sfondo'],
  ['field', 'surface', UI, 'bordo dei campi su superficie'],
  ['field', 'raised', UI, 'bordo dei campi su card'],
  ['ok', 'bg', UI, 'indicatore di stato su sfondo'],
  ['ok', 'raised', UI, 'indicatore di stato su card'],
  ['fg', 'bg', UI, 'anello di focus'],
];

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function readBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Blocco ${selector} non trovato in tokens.css`);
  const tokens = {};
  for (const [, name, value] of match[1].matchAll(/--tp-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[name] = value;
  }
  return tokens;
}

function luminance(hex) {
  const channel = (offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function ratio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const light = readBlock(':root');
const themes = {
  'chiaro (:root)': light,
  'scuro (.tone-dark)': { ...light, ...readBlock('.tone-dark') },
};

let failures = 0;
for (const [themeName, tokens] of Object.entries(themes)) {
  for (const [foreground, background, minimum, label] of PAIRS) {
    const fg = tokens[foreground];
    const bg = tokens[background];
    if (!fg || !bg) {
      console.error(`✗ ${themeName}: token mancante (${foreground} / ${background})`);
      failures += 1;
      continue;
    }
    const value = ratio(fg, bg);
    if (value < minimum) {
      failures += 1;
      console.error(
        `✗ ${themeName}: ${label} — ${foreground} ${fg} su ${background} ${bg} = ${value.toFixed(2)}:1 (minimo ${minimum}:1)`,
      );
    }
  }
}

if (failures > 0) {
  console.error(`\nContrasto: ${failures} coppie sotto soglia. Correggi src/styles/tokens.css.`);
  process.exit(1);
}
console.log(`Contrasto: ${PAIRS.length * 2} coppie verificate, tutte conformi a WCAG 2.2 AA.`);
