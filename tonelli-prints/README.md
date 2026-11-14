# Tonelli Prints

Sito B2B single page di Tonelli Prints. Statico (Astro SSG), contenuti in file JSON/Markdown validati con Zod, JavaScript solo dove serve: circa 17 KB non compressi. La scena 3D dell'hero (three.js + GSAP, 177 KB gzip) è un modulo a parte, scaricato solo dai dispositivi che possono mostrarla.

## Stack

| Cosa         | Versione                | Note                                                                   |
| ------------ | ----------------------- | ---------------------------------------------------------------------- |
| Astro        | 7.4                     | output statico, nessun framework UI                                    |
| Tailwind CSS | 4.3                     | via `@tailwindcss/vite` (integrazione ufficiale per Astro)             |
| three.js     | 0.187                   | scena 3D dell'hero, caricata solo dove serve                           |
| GSAP         | 3.15                    | timeline della scena 3D (licenza standard gratuita)                    |
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
                     logo-stage/: scena 3D interattiva dell'hero (three.js + GSAP)
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

## Scena 3D dell'hero

Al centro dell'hero il logo Tonelli viene prodotto in tempo reale, in quattro fasi su un'unica timeline:

1. **Stampa base** (0-35%): l'ugello scende sul piatto PEI e stampa fino a metà altezza, con pareti e riempimento a nido d'ape in vista e il bordo dello strato attivo ancora caldo.
2. **Inserimento NFC** (35-60%): l'ugello si parcheggia, la camera scende sulla sede circolare, il tag cala al suo posto e un'onda conferma l'inserimento.
3. **Chiusura** (60-85%): la stampa riprende e sigilla il tag dentro il pezzo.
4. **Prodotto finito** (85-100%): piatto e ugello svaniscono, il logo si alza e si può trascinare per ruotarlo. Passando sul centro (o con l'interruttore) i raggi X mostrano il tag all'interno.

Tecnica: [three.js](https://threejs.org) per la scena, [GSAP](https://gsap.com) per la timeline. Niente React: il sito è Astro vanilla.

- **File**: `src/scripts/logo-stage/` (`logo.ts` geometria e texture procedurali, `scene.ts` scena three.js, `timeline.ts` le fasi, `index.ts` controlli e interazione). Il markup è in `src/components/sections/Hero.astro`.
- **Logo**: la geometria viene dal tracciato di `src/assets/brand/mark.svg`, estruso con smusso (`ExtrudeGeometry`). L'SVG è stato ricavato vettorizzando `mark.png`: se esiste il vettoriale originale, sostituiscilo (il tracciato deve usare solo comandi `M`, `C`, `Z` assoluti) e ricontrolla `POCKET_VIEW` in `logo.ts`, cioè dove sta il tag.
- **Miglioramento progressivo**: il contenuto di base è il logo SVG statico. La scena parte solo con WebGL 2 e accelerazione hardware; in caso contrario (anche in Lighthouse e in CI) three.js e GSAP **non vengono nemmeno scaricati**. Se il contesto WebGL va perso torna il logo.
- **Peso**: il modulo della scena è circa 660 KB (177 KB gzip), in un file separato caricato a pagina ferma. Il resto del sito resta sui 17 KB.
- **Controlli**: le quattro fasi sono pulsanti (si salta a una fase e la si rivede), sei campioni cambiano il filamento al volo, un interruttore accende i raggi X a prodotto finito. Non c'è controllo via scroll: lo scroll verticale della pagina resta sempre libero, anche con il dito sulla scena (`touch-action: pan-y`).
- **Accessibilità**: bottone pausa (WCAG 2.2.2), con `prefers-reduced-motion` la scena parte dal prodotto finito e le fasi si consultano a scatti. Il canvas ha `role="img"` con descrizione.
- **Testi**: `hero.logoStage` in `src/content/ui/<lingua>.json`. I nomi dei filamenti arrivano da `src/content/materials/`.
- **Colori**: filamenti in `--tp-filament-<id>`, scena in `--tp-stage-*` (`src/styles/tokens.css`). La resa dei filamenti (ruvidità, metallo, rilievo dei layer) è in `LOOKS` in `index.ts`.
- **Tempi**: `DURATION` e i tween in `timeline.ts`.

I test in `tests/smoke.spec.ts` ("scena 3D dell'hero") coprono: senza WebGL (logo statico, nessun download), con WebGL (fasi, raggi X, materiali, pausa) e movimento ridotto.

## Lingue

Italiano (lingua di default, `/`), inglese (`/en/`) e olandese (`/nl/`) sono pubblicati.

- **Cambio lingua**: selettore IT/EN/NL in alto a destra nell'header (`src/components/ui/LanguageSwitch.astro`) e nel footer. Porta alla stessa pagina nell'altra lingua e mantiene l'ancora della sezione. Mostra solo le lingue con `enabled: true`.
- **Testi inglesi e olandesi**: `src/content/<collection>/<lingua>.json` e `src/content/legal/<lingua>/`. Dove esisteva, il testo viene dal sito originale; il resto è tradotto dall'italiano. Ogni modifica a un file `it.json` va riportata negli altri due: stessa struttura, la build fallisce se manca un campo.
- **Pagina 404**: esiste solo in italiano.

Per aggiungere un'altra lingua:

1. aggiungi il codice a `LOCALE_CODES` in `src/config/constants.ts` e la voce in `locales` di `src/config/site.ts`;
2. copia ogni `src/content/<collection>/it.json` in `<lingua>.json` e traducilo;
3. copia `src/content/legal/it/` in `src/content/legal/<lingua>/`;
4. metti `enabled: true` sulla lingua.

La build genera `/<lingua>/`, aggiunge gli `hreflang`, aggiorna la sitemap e fa comparire la lingua nei due selettori. Se manca un file, la build fallisce dicendo quale.

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
- [ ] Logo vettoriale originale: `mark.svg` è ricavato dal PNG per vettorizzazione automatica, il logotipo completo è ancora PNG (`src/assets/brand/`)
- [ ] `public/og-image.png`: è quella attuale, con tagline in inglese

**Da far validare**

- [ ] Pagine legali: tutti i punti `[DA COMPILARE]`, da un legale (`src/content/legal/it/`)
- [ ] Traduzioni EN e NL: far rileggere a un madrelingua, soprattutto le pagine legali
- [ ] Affermazioni dei testi originali riportate così come sono ("oltre 40 hotel e ristoranti", "+15% di riordini", ecc.)
- [ ] Data "Ultimo aggiornamento" delle pagine legali (campo `updated` nel frontmatter)

## Note

- Il font è Inter variabile, subset latin, self-hosted (`src/assets/fonts/`, licenza SIL OFL inclusa).
- Le foto originali in `.png` del sito attuale erano in realtà JPEG: sono state rinominate `.jpg` e limitate a 2000 px sul lato lungo.
- Il sito non ha contenuti che dipendono dalla data, quindi non serve un build hook giornaliero. L'anno nel footer è quello dell'ultima build.
