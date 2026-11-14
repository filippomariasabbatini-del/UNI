# Tonelli Prints

Sito B2B single page di Tonelli Prints. Statico (Astro SSG), contenuti in file JSON/Markdown validati con Zod, JavaScript solo dove serve: circa 17 KB non compressi, più 13,5 KB (5,7 KB gzip) per la scena di stampa dell'hero, caricati solo in home e a pagina ferma.

## Stack

| Cosa         | Versione                | Note                                                                   |
| ------------ | ----------------------- | ---------------------------------------------------------------------- |
| Astro        | 7.4                     | output statico, nessun framework UI                                    |
| Tailwind CSS | 4.3                     | via `@tailwindcss/vite` (integrazione ufficiale per Astro)             |
| TypeScript   | 6.0, preset `strictest` | TS 7 non è ancora supportato da `@astrojs/check` e `typescript-eslint` |
| Node         | 22 LTS (>= 22.23.4)     | vedi `.nvmrc`                                                          |
| pnpm         | 10                      |                                                                        |
| Test         | Playwright + axe-core   | unit, smoke, accessibilità                                             |

## Comandi

```bash
pnpm install
```

```bash
pnpm dev
```

| Script           | Cosa fa                                                  |
| ---------------- | -------------------------------------------------------- |
| `pnpm dev`       | server di sviluppo su `http://localhost:4321`            |
| `pnpm build`     | controllo contrasto dei colori, poi build in `dist/`     |
| `pnpm preview`   | serve `dist/` in locale                                  |
| `pnpm check`     | `astro check` (tipi di `.astro` e `.ts`)                 |
| `pnpm lint`      | ESLint + Prettier in sola verifica                       |
| `pnpm format`    | Prettier in scrittura (ordina anche le classi Tailwind)  |
| `pnpm contrast`  | solo il controllo WCAG dei token colore                  |
| `pnpm test`      | tutti i test Playwright sulla build (prima `pnpm build`) |
| `pnpm test:a11y` | solo i test di accessibilità (axe, target touch)         |

Prima di ogni commit: `pnpm check && pnpm lint && pnpm build && pnpm test`.

La prima volta, per i test serve il browser di Playwright:

```bash
pnpm exec playwright install chromium
```

## Struttura

```
src/
  config/
    site.ts          contatti, sedi, orari, lingue, analytics (schema Zod)
    pricing.ts       UNICO file dei prezzi del configuratore
    constants.ts     costanti senza dipendenze, usabili anche nel browser
  content/           TUTTI i testi: un file per collection per lingua
    ui/it.json         titoli, bottoni, etichette, messaggi
    products/it.json   le card "Cosa facciamo"
    projects/it.json   case study e testimonianze
    team/it.json       persone
    studios/it.json    descrizione delle sedi
    process/it.json    i quattro passi
    materials/it.json  i sei materiali
    legal/it/*.md      privacy, cookie, termini, note legali
  content.config.ts  schemi Zod delle collection
  styles/
    tokens.css       colori, ombre, raggi (unica fonte di verità)
    global.css       Tailwind, font, stili di base e dei pochi componenti CSS
  components/
    ui/              Button, Card, Container, Section, Heading, Icon, Photo, ...
    sections/        Hero, Products, Projects, About, Studios, Process, Materials, Estimator, Contact, ...
    seo/             SEO.astro, JsonLd.astro
  layouts/BaseLayout.astro
  pages/
    [...locale]/index.astro     home (una per lingua abilitata)
    [...locale]/[legal].astro   /privacy.html, /cookies.html, /terms.html, /imprint.html
    404.astro, robots.txt.ts
  lib/               funzioni pure: pricing, studio-hours, i18n, schema-org, security-headers, format, images
  scripts/           moduli vanilla del browser (menu, configuratore, form, carosello, orologio, ...)
                     print-stage.ts + print-stage.frag.glsl: scena di stampa 3D dell'hero (WebGL)
  integrations/      genera dist/_headers a fine build
scripts/check-contrast.mjs
tests/               unit.spec.ts, smoke.spec.ts, a11y.spec.ts
```

## Modificare i contenuti

Tutti i testi stanno in `src/content/`. Se un file viola lo schema (campo mancante, `alt` vuoto, id sconosciuto) **la build fallisce** con il nome del campo.

- **Testi di interfaccia**: `src/content/ui/it.json`.
- **Aggiungere un prodotto o un progetto**: aggiungi un oggetto all'array `items` del file. L'immagine va in `src/assets/photos/` e il campo `image.src` è relativo al JSON (`../../assets/photos/nome.jpg`). `image.alt` è obbligatorio. AVIF, WebP e `srcset` vengono generati in build.
- **Team**: `src/content/team/it.json`. `role`, `place`, `bio`, `avatar` possono essere `null`: la card mostra un segnaposto.
- **Materiali**: testi in `src/content/materials/it.json`, prezzi e tempi in `src/config/pricing.ts`. Con `specs: null` la scheda mostra "Scheda in arrivo".
- **Contatti, telefoni, orari, social**: `src/config/site.ts`.
- **Colori**: `src/styles/tokens.css`. `pnpm build` blocca le coppie sotto 4.5:1 (testo) o 3:1 (UI).

I campi `todo` nei JSON sono note per chi compila i dati: non compaiono mai nel sito.

### Prezzi del configuratore

`src/config/pricing.ts` contiene la curva a scaglioni (moltiplicatori rispetto al prezzo a 100 pezzi, interpolati linearmente tra uno scaglione e l'altro). **Solo due punti sono reali** (PLA+ 2.0: 100 pezzi a 3,40 €, 150 pezzi a 449 €): il resto è segnaposto. Un materiale con `unitPriceAt100: null` mostra "Su richiesta". I test in `tests/unit.spec.ts` verificano i due punti reali e che il totale non scenda mai aumentando i pezzi.

## Scena di stampa dell'hero

Il riquadro centrale dell'hero mostra tre oggetti in vetro stampati strato dopo strato, in loop: stampa, giro di presentazione, fusione, pezzo successivo. È uno shader WebGL scritto a mano (raymarching di superfici implicite), senza librerie.

- **Miglioramento progressivo**: la foto resta il contenuto di base. La scena la sostituisce solo se WebGL è disponibile con accelerazione hardware. Senza JavaScript, senza WebGL, con GPU software (è il caso di Lighthouse e della CI) o se il contesto va perso, resta la foto.
- **Prestazioni**: gira solo quando è visibile, parte a pagina ferma, la risoluzione è limitata a 1,5× e scala da sola se i frame superano 26 ms. Se non basta, torna la foto.
- **Accessibilità**: bottone pausa (WCAG 2.2.2). Con `prefers-reduced-motion` mostra il primo oggetto finito e fermo. Il canvas ha `role="img"` con descrizione; il pannello con strato e avanzamento è decorativo (`aria-hidden`).
- **Testi** (nomi degli oggetti, etichette, descrizione): `hero.printStage` in `src/content/ui/it.json`.
- **Colori del vetro**: `--tp-glass-1/2/3` in `src/styles/tokens.css`. Accento, sfondo e inchiostro dello shader arrivano dagli stessi token del sito.
- **Forme**: funzioni `tag`, `cat`, `logo` in `src/scripts/print-stage.frag.glsl`. Se cambi un oggetto aggiorna anche `HEIGHTS` e `footprint` in `src/scripts/print-stage.ts` (altezza e ingombro, usati per l'ugello e il conteggio degli strati).
- **Tempi del ciclo**: costanti `PRINT`, `SHOW`, `MELT`, `GAP` in `print-stage.ts`.

I test in `tests/smoke.spec.ts` ("scena di stampa dell'hero") coprono i tre casi: senza WebGL, con WebGL (avvio, pausa, ripresa) e con movimento ridotto.

## Lingue

L'italiano è completo. Inglese e olandese sono predisposti ma spenti. Per accenderne una:

1. copia ogni `src/content/<collection>/it.json` in `<lingua>.json` e traducilo;
2. copia `src/content/legal/it/` in `src/content/legal/<lingua>/`;
3. in `src/config/site.ts` metti `enabled: true` sulla lingua.

La build genera `/<lingua>/`, aggiunge gli `hreflang`, aggiorna la sitemap e attiva il link nel selettore del footer. Se manca un file, la build fallisce dicendo quale. Gli `hreflang` vengono emessi solo per le lingue pubblicate, per non puntare a pagine inesistenti.

## Form contatti

Il form invia a `PUBLIC_FORM_ENDPOINT` (variabile d'ambiente, vedi `.env.example`). Nessuna chiave nel codice.

- **Formspree o simili**: metti l'URL del form. L'invio è un `POST` con `FormData` e `Accept: application/json`.
- **Resend**: serve una funzione lato server (es. Netlify Function) che tenga la chiave API; metti il suo URL nella variabile.
- **Variabile vuota**: il form apre il client di posta con il messaggio già compilato (`mailto:`).

Campi inviati: `azienda`, `email`, `materiale`, `messaggio`, `prodotto` (se si arriva da "Scopri di più"), `_gotcha` (honeypot: se è compilato l'invio viene scartato).

## Deploy su Netlify

1. Nuovo sito da Git, **Base directory** `tonelli-prints`. Comando e cartella di pubblicazione sono in `netlify.toml` (`pnpm build`, `dist`).
2. In _Site configuration → Environment variables_ imposta `PUBLIC_FORM_ENDPOINT` (facoltativa).
3. Collega il dominio `tonelliprints.com`. Se l'URL cambia, aggiornalo in `src/config/site.ts` (`url`): da lì derivano canonical, Open Graph, sitemap e JSON-LD.

### Header di sicurezza

`dist/_headers` viene **generato a ogni build** da `src/integrations/security-headers.ts`, non scritto a mano: così la Content-Security-Policy contiene esattamente l'origine del form e dell'eventuale analytics.

- CSP senza `unsafe-inline`: CSS e JS sono sempre file esterni (`inlineStylesheets: 'never'`, `assetsInlineLimit: 0`). Per questo nei componenti non si usano attributi `style=""`.
- HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`.
- `/_astro/*` (file con hash): cache immutabile per un anno. HTML: default Netlify, sempre rivalidato.

Un test (`tests/smoke.spec.ts`, "sicurezza") carica la home con la CSP generata e fallisce se il browser blocca una risorsa.

### Analytics

Spento di default. In `site.ts` → `analytics` si può attivare Plausible o Umami (cookieless): la CSP si aggiorna da sola. Se un giorno si aggiungono cookie non essenziali, `cookies.hasNonEssential: true` fa comparire Accetta/Rifiuta nel banner; la scelta è in `localStorage` (`tp-consent`) e viene notificata con l'evento `tp:consent`.

## CI

`.github/workflows/tonelli-prints-ci.yml` (nella root del repo), su push a `main` e sulle pull request che toccano `tonelli-prints/`:

- **quality**: `check`, `lint`, `build` (con controllo contrasto), test Playwright desktop e mobile;
- **lighthouse**: Lighthouse CI mobile su home e privacy, 3 run, soglia 90 per categoria (`lighthouserc.json`).

Risultato locale al momento della consegna: 100 in tutte le categorie, LCP 0,9 s, CLS 0.

## TODO: dati mancanti e cose da validare

Cerca `TODO` nel codice per trovare ogni punto.

**Dati mancanti**

- [ ] Prezzi e tempi di consegna di PETG, fibra di carbonio, Silky-PLA, Wood-PLA, TPU (`src/config/pricing.ts`)
- [ ] Scaglioni di prezzo oltre i due punti noti del PLA+ e giorni extra oltre i 150 pezzi (`src/config/pricing.ts`)
- [ ] Specifiche dei cinque materiali senza dati e palette colori di tutti e sei (`src/content/materials/it.json`)
- [ ] Orari di apertura dei due studi: ora lun-ven 09:00-18:00 segnaposto (`src/config/site.ts`). Finché `hours.confirmed` è `false` non finiscono nel JSON-LD
- [ ] Indirizzo completo di Roma (civico e CAP di Via Monteciccardo) e indirizzo di Nimega (`site.ts` e `studios/it.json`)
- [ ] Numero KVK (`site.ts` → `legal.kvk`), partita IVA e forma giuridica (pagina note legali)
- [ ] Ruolo, sede, bio e foto di Riccardo Tonelli (`src/content/team/it.json`)
- [ ] Endpoint del form (`PUBLIC_FORM_ENDPOINT`)

**Asset da sostituire**

- [ ] Foto reali di Leonardo e Lieke al posto delle illustrazioni SVG (`src/assets/team/`)
- [ ] Logo in SVG vettoriale: ora è il PNG del sito attuale ridimensionato (`src/assets/brand/`)
- [ ] `public/og-image.png`: è quella attuale, con tagline in inglese

**Da far validare**

- [ ] Pagine legali: tutti i punti `[DA COMPILARE]`, da un legale (`src/content/legal/it/`)
- [ ] Traduzioni EN e NL (non presenti)
- [ ] Affermazioni dei testi originali riportate così come sono ("oltre 40 hotel e ristoranti", "+15% di riordini", ecc.)
- [ ] Data "Ultimo aggiornamento" delle pagine legali (campo `updated` nel frontmatter)

## Note

- Il font è Inter variabile, subset latin, self-hosted (`src/assets/fonts/`, licenza SIL OFL inclusa).
- Le foto originali in `.png` del sito attuale erano in realtà JPEG: sono state rinominate `.jpg` e limitate a 2000 px sul lato lungo.
- Il sito non ha contenuti che dipendono dalla data, quindi non serve un build hook giornaliero. L'anno nel footer è quello dell'ultima build.
