---
name: Valkyrien Holding
description: Institutional site for a cross-border defence and dual-use project structurer. Navy surfaces, white type, muted gold, line-art only.
source:
  - src/styles/tokens.css
  - src/styles/main.css
  - src/styles/components/ui.css
  - src/styles/components/header.css
  - src/styles/components/hero.css
  - src/styles/components/cards.css
  - src/styles/components/process.css
  - src/styles/components/form.css
  - src/styles/components/footer.css
  - src/styles/components/motion.css
  - src/styles/components/intro.css
  - src/styles/components/vest.css
  - src/scripts/tokens.js
  - tools/contrast-check.mjs
  - tools/ui-audit.mjs
generatedAt: "2026-11-18"
colors:
  paper: "#0a192f"
  paper-alt: "#0f213d"
  line: "#22365a"
  ink: "#ffffff"
  ink-raised: "#172b4d"
  ink-muted: "#c3cad6"
  on-gold: "#0a192f"
  gold: "#b8935a"
  gold-strong: "#dcbc88"
  signal: "#7ea6ff"
  signal-strong: "#b4c9ff"
  mesh-1: "rgb(59 79 216 / 0.20)"
  mesh-2: "rgb(126 166 255 / 0.12)"
  mesh-3: "rgb(184 147 90 / 0.12)"
  mesh-4: "rgb(31 79 122 / 0.22)"
gradients:
  hero-glow: "radial blue 9% at 82% 42% + radial gold 8% at 64% 78%"
  navy: "radial gold 16% top-right over linear 135deg {colors.ink-raised} -> {colors.paper-alt}"
  surface: "linear 180deg {colors.paper-alt} -> {colors.paper}"
  rule: "linear 90deg {colors.gold} -> transparent"
typography:
  display:
    fontFamily: "Montserrat Variable, Inter Variable, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.35rem + 2.9vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  heading:
    fontFamily: "Montserrat Variable, Inter Variable, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.25rem + 1.1vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter Variable, Roboto, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "cv11, ss01"
  lead: { fontSize: "clamp(1.0625rem, 1rem + 0.3vw, 1.25rem)", lineHeight: 1.6 }
  eyebrow: { fontFamily: "Montserrat Variable", fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }
  chip: { fontFamily: "Montserrat Variable", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }
  mono: { fontFamily: "ui-monospace, SF Mono, Cascadia Mono, Roboto Mono, Menlo, monospace", fontSize: "0.75rem" }
  scale: { 2xs: "0.75rem", xs: "0.8125rem", sm: "0.875rem", base: "1rem", lg: "clamp(1.0625rem, 1rem + 0.3vw, 1.25rem)", xl: "clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)", 2xl: "clamp(1.5rem, 1.25rem + 1.1vw, 2.25rem)", display: "clamp(2rem, 1.35rem + 2.9vw, 3.75rem)" }
radius: { sm: "2px", md: "4px" }
spacing:
  unit: "0.25rem"
  gutter: "clamp(1rem, 0.5rem + 2.5vw, 2.5rem)"
  section: "clamp(4rem, 2.5rem + 6vw, 8rem)"
  container: "80rem"
  prose: "42rem"
shadows:
  - { name: "edge", value: "inset 0 1px 0 rgb(255 255 255 / 0.06)", purpose: "1px light edge on the top of raised surfaces (cards, console, popovers)" }
  - { name: "1", value: "0 1px 2px rgb(0 0 0 / 0.30), 0 1px 1px rgb(0 0 0 / 0.20)", purpose: "cards at rest" }
  - { name: "2", value: "0 18px 36px -18px rgb(0 0 0 / 0.65), 0 30px 60px -30px rgb(2 8 23 / 0.70)", purpose: "card hover, floating panels (console)" }
  - { name: "header", value: "0 12px 30px -16px rgb(0 0 0 / 0.6)", purpose: "sticky header once scrolled" }
  - { name: "popover", value: "0 18px 40px -18px rgb(0 0 0 / 0.65)", purpose: "language menu" }
motion:
  - { name: "ease-institutional", value: "cubic-bezier(0.22, 1, 0.36, 1)", purpose: "default for hover, reveal, docking" }
  - { name: "ease-focus", value: "cubic-bezier(0.33, 1, 0.68, 1)", purpose: "blur-to-focus and logo draw" }
  - { name: "ease-strike", value: "cubic-bezier(0.55, 0, 1, 0.45)", purpose: "projectiles only (intro arrow, vest round)" }
  - { name: "ease-fade", value: "cubic-bezier(0.45, 0, 0.55, 1)", purpose: "symmetric cross-fades" }
  - { name: "duration-tactical", value: "180ms", purpose: "hover / press" }
  - { name: "duration-base", value: "320ms", purpose: "header shadow, vest show/hide" }
  - { name: "duration-reveal", value: "640ms", purpose: "scroll reveal" }
  - { name: "duration-focus", value: "800ms", purpose: "load blur-to-focus, logo draw" }
  - { name: "reveal-distance", value: "12px", purpose: "maximum vertical travel of any reveal" }
  - { name: "reveal-stagger", value: "80ms", purpose: "delay between blocks entering together" }
breakpoints:
  - { name: "phone-compact", value: "30rem", use: "max-width: brand descriptor hidden, compact language switcher" }
  - { name: "sm", value: "40rem", use: "hero mobile layout (max); console two-column (min)" }
  - { name: "md", value: "56rem", use: "two-column problem block, closing band, footer (min)" }
  - { name: "lg", value: "64rem", use: "process section two-column (min)" }
  - { name: "nav", value: "76rem", use: "max-width: primary nav collapses to menu (sized for FR/ES labels)" }
  - { name: "rail", value: "87.5rem", use: "max-width: vest leaves the side rail and becomes a bottom-right chip" }
icons:
  set: "In-house inline SVG line-art (no icon library)"
  source: "src/templates/pages/*.html, src/templates/partials/*.html"
  grid: "24x24 viewBox"
  sizes: { inline: "1.125rem", default: "1.5rem", card: "2rem" }
  style: { variant: "outline", strokeWidth: 1.5, linecap: "round", linejoin: "round" }
  color: "currentColor"
  hoverAccent: "one path per icon carries class=trace + pathLength=1 and is redrawn on hover"
components:
  button-primary:
    source: "src/styles/components/ui.css (.btn)"
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    radius: "{radius.sm}"
    minHeight: "3rem"
    padding: "0.75rem 1.5rem"
    hover: { backgroundColor: "{colors.ink-raised}", textColor: "{colors.ink}", ring: "inset 1px {colors.gold}" }
    states: [hover, active, focus-visible, disabled]
  button-ghost:
    source: "src/styles/components/ui.css (.btn--ghost)"
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1px {colors.ink}"
    hover: { textColor: "{colors.signal-strong}", border: "1px {colors.signal}", ring: "inset 1px {colors.signal}" }
  card:
    source: "src/styles/components/cards.css (.card)"
    backgroundColor: "{colors.paper}"
    border: "1px {colors.line}"
    radius: "{radius.sm}"
    padding: "1.75rem 1.5rem"
    shadow: "{shadows.edge}, {shadows.1}"
    hover: { border: "{colors.gold-strong}", shadow: "{shadows.edge}, {shadows.2}, inset 1px {colors.gold-strong}", marks: "four 10px registration ticks, 8px outside the box, {colors.gold-strong}" }
  card-link:
    source: "src/styles/components/cards.css (.card--link)"
    note: "Whole card is the link; CTA row uses {colors.signal}"
  chip:
    source: "src/styles/components/process.css (.chip), src/styles/components/cards.css (.card__tag)"
    border: "1px {colors.line}"
    radius: "{radius.sm}"
    typography: "{typography.chip}"
  console:
    source: "src/styles/components/process.css (.console)"
    backgroundColor: "{colors.paper-alt}"
    barBackground: "{colors.paper}"
    radius: "{radius.md}"
    shadow: "{shadows.edge}, {shadows.2}"
    stepStates: { done: "{colors.gold-strong}", current: "{colors.signal}", pending: "{colors.ink-muted} + dashed index" }
  form-field:
    source: "src/styles/components/form.css"
    backgroundColor: "{colors.paper-alt}"
    border: "1px {colors.line}"
    radius: "{radius.sm}"
    minHeight: "3rem"
    focus: "2px {colors.signal} outline, 2px offset"
    label: "visible, above the field, 600 weight"
  jurisdiction-clock:
    source: "src/styles/components/hero.css (.clock), src/scripts/main.js (initClocks)"
    typography: "{typography.mono}, tabular-nums, {colors.gold-strong}"
    data: "Intl.DateTimeFormat in the page locale, per IANA zone; hidden without JS"
  dossier-number:
    source: "src/styles/components/ui.css (main > .section .eyebrow::before)"
    pattern: "§ NN (CSS counter per page) + 2rem gold rule, decorative (alt text empty)"
  site-header:
    source: "src/styles/components/header.css (.site-header)"
    backgroundColor: "color-mix({colors.paper} 92%, transparent) + backdrop blur"
    scrolled: "{shadows.header}"
  language-switch:
    source: "src/styles/components/header.css (.lang-switch)"
    pattern: "<details> disclosure; works without JS"
  hero:
    source: "src/styles/components/hero.css (.hero)"
    layers: "video+80% overlay -> network line-art + fade -> atmospheric mesh -> content"
  closing-band:
    source: "src/styles/components/footer.css (.closing-cta)"
    background: "{gradients.navy}"
  intro:
    source: "src/styles/components/intro.css, src/scripts/intro.js"
    duration: "2.5s (TOTAL constant)"
  vest:
    source: "src/styles/components/vest.css, src/scripts/vest.js"
---

# Design System: Valkyrien Holding

## Overview

**Creative North Star: "The Cleared Corridor"**

A passage between jurisdictions that has already been checked. Everything on the page should read as screened, measured and accounted for: navy depth, white type that never strains, gold used the way a seal is used. Motion exists to show that something was verified (a route flown, a round deflected, a document brought into focus), never to entertain.

The system is dark, quiet and precise. Surfaces are layered navies; depth comes from light edges and long, soft shadows rather than colour. Geometry is sharp (2px corners), lines are 1.5px, and illustration is line-art only. Stripe-style details (an atmospheric mesh in the hero, layered elevation, tabular figures, a composited process console) are adopted for polish, filtered through this restraint.

It must never look like: an **opaque broker** (vague claims, no people, no process), a **WordPress template**, **aggressive military** aesthetics (camouflage, stencil type, crosshairs-as-decoration), or **playful fintech** (pastel blobs, bouncy motion, pill-shaped everything).

**Key Characteristics:**
- Navy surfaces (`#0a192f` / `#0f213d`), white primary type, gunmetal-light secondary type.
- Muted gold as the single accent; electric blue reserved for links, focus and "in progress".
- 2px corners on every control and card; 4px only on floating panels.
- Line-art illustration and icons at 1.5px, `currentColor`, no stock imagery.
- Layered depth: 1px light edge + soft long shadow; hover deepens shadow, never moves the element.
- Motion on `ease-institutional`, at most 12px of travel, no overshoot.

## Colors

A night palette: two navies for surfaces, white for reading, one warm metal for intent.

### Surface
- **Corridor Navy** (`#0a192f`, `paper`): page background, cards, footer, header (92% with blur).
- **Raised Navy** (`#0f213d`, `paper-alt`): hero, alternate sections, console body, placeholder notes.
- **Signal Navy** (`#172b4d`, `ink-raised`): hover fill of buttons, the closing band gradient.
- **Hairline** (`#22365a`, `line`): 1px borders and dividers. Decorative only, never a text colour.

### Ink
- **Clear White** (`#ffffff`, `ink`): headings, body, icons at rest on interactive surfaces.
- **Gunmetal Light** (`#c3cad6`, `ink-muted`): leads, captions, metadata, inactive states.
- **On-Gold Navy** (`#0a192f`, `on-gold`): the only text colour allowed on gold fills.

### Accent
- **Muted Gold** (`#b8935a`, `gold`): primary CTA fill, rules, route dashes, logo inner chevron, hover rings on navy.
- **Seal Gold** (`#dcbc88`, `gold-strong`): gold as text (eyebrows, "done" states) and card hover rings.
- **Electric Blue** (`#7ea6ff`, `signal`): links, focus ring, "in progress"; `signal-strong` (`#b4c9ff`) for hover labels.
- **Mesh fields** (`mesh-1..4`): indigo, blue, gold and teal-navy at 12-22% alpha, hero mesh only.

**The Gold Is Earned Rule.** At most one filled gold button per section. The header CTA is the single persistent exception.

**The Cleared Contrast Rule.** Every text/background pair, including the worst case over mesh, gradient or video layers, is at least 4.5:1 (3:1 for UI boundaries) as measured by `tools/contrast-check.mjs`. A new layer behind text must add its worst case to that script before it ships.

## Typography

**Display:** Montserrat Variable (fallback Inter, system-ui) / **Body:** Inter Variable (fallback Roboto, system-ui) / **Mono:** system monospace stack (console only).

**Character:** Montserrat at 600 with tight negative tracking gives headlines a compact, engineered mass; Inter with `cv11` and `ss01` keeps long compliance copy calm and legible.

### Hierarchy
- **Display** (600, `clamp(2rem … 3.75rem)`, 1.08, -0.025em): one per page, the H1.
- **Heading** (600, `clamp(1.5rem … 2.25rem)`, 1.15, -0.015em): H2 section titles; `balance` wrapping.
- **Card title** (600, `lg`, 1.25): H3 and card titles.
- **Lead** (400, `lg`, 1.6, `ink-muted`): one paragraph under a heading, max 38-42rem.
- **Body** (400, 1rem, 1.6): running text, max `prose` (42rem).
- **Eyebrow** (600, 13px, 0.14em, uppercase, `gold-strong`, gradient rule before): section labels.
- **Chip** (600, 12px, 0.1em, uppercase): tags such as PDF, Illustrative, step states.
- **Mono** (12px): console paths and machine-like values only.

**The Typesetting Rule.** Copy uses typographic characters: `…` not `...`, curly quotes in each language's own form (“ ” EN/IT, « » FR/ES, „ “ DE), a no-break space between a number and its unit (`24 business hours`), and in French a narrow no-break space before `; ? !` and inside « », a no-break space before `:`.

**The Do-Not-Translate Rule.** Company names, the brand wordmark, jurisdiction codes and regime codes carry `translate="no"`.

**The Tabular Rule.** Indices (01-05), registration numbers and any figure in a list or console use `font-variant-numeric: tabular-nums`.

German headings hyphenate automatically only for words of 12+ letters (`hyphenate-limit-chars: 12 5 5`). The 11px labels inside the hero network SVG are SVG user units, outside the CSS type scale.

## Elevation

Layered, not flat. A raised surface carries two things: a 1px inner light edge on its top (`shadows.edge`) and a soft shadow (`shadows.1` at rest). Interaction deepens the shadow to `shadows.2` and adds an inset ring; the surface itself never moves. Floating panels (console, language menu) start at `shadows.2` / `shadows.popover`.

**The 44px Touch Rule.** On coarse pointers every control outside running text (nav, language switcher, footer links, brand link, buttons) is at least 44px tall. `tools/ui-audit.mjs` enforces it, together with axe WCAG 2.2 AA, Tab order, visible focus and focus not obscured.

**The No-Geometry-Hover Rule.** Hover and press never change an element's size or position: no `scale`, no `translate` on the element box. Only fill, border, inset ring and shadow change. Icons inside may redraw or shift up to 2px within the box.

## Motion

All curves come from tokens (`ease-*`), and JS reads the same tokens through `src/scripts/tokens.js`.

- **Load:** H1 and lead move from blur to focus (`duration-focus` 800ms, `ease-focus`, lead delayed 120ms). The logo mark draws frame, structure, then gold route.
- **Intro (Home, first visit per session):** globe, shield parries arrow, globe squares into the logo frame, mark docks into the header. 2.5s. It is skipped only by scrolling down (wheel, swipe, scroll keys), and never runs with reduced motion or on deep links.
- **Scroll:** blocks fade up 12px (`duration-reveal` 640ms), 80ms stagger for blocks entering together.
- **Hover:** `duration-tactical` 180ms.
- **Ambient:**
  - route dashes drift;
  - one aircraft flies a random leg between UK, LU and CH;
  - the hero mesh drifts over 38-52s;
  - the console "in progress" dot pulses;
  - the scroll vest takes a deflected round each time a new section enters while scrolling down.

**The 12px Travel Rule.** No reveal travels more than `reveal-distance` (12px). No easing overshoots (no bounce, no elastic).

**The Reduced-Motion Rule.** With `prefers-reduced-motion: reduce`, every ambient and intro animation is off and every block is immediately visible.

## Responsive / Layout

One container (`80rem`, fluid gutter `clamp(1rem … 2.5rem)`), sections padded `clamp(4rem … 8rem)`, all spacing on a 4px grid (`0.25rem` unit). Card grids are `auto-fit` with a `13rem` minimum, so five cards sit on one row at desktop and stack cleanly below.

- **≤30rem:** the header shows the mark and name only; the language switcher is compact.
- **≤40rem:** the hero stacks, CTAs go full width, and the network art drops below the copy.
- **≥40rem:** the console splits into steps and checks.
- **≥56rem:** two-column problem block, closing band and footer.
- **≥64rem:** the process section has copy on the left and the console on the right.
- **≤76rem:** the primary nav collapses into a menu. This breakpoint is sized for the longest locale (FR/ES), not English.
- **≤87.5rem:** the vest leaves the side rail and becomes a bottom-right chip.

## Components

The implementation in each `source` is the truth; nothing here copies its markup or CSS.

### Buttons
- **Shape:** sharp, 2px corners; minimum height 48px (40px in the header).
- **Primary:** Muted Gold fill with On-Gold Navy label. On hover it turns Signal Navy with a white label and an inset 1px gold ring, and the arrow shaft redraws.
- **Ghost:** transparent with a 1px white border. On hover the border turns blue and doubles via an inset ring, and the label shifts to `signal-strong`.

### Cards / Containers
- **Card:** Corridor Navy on a Raised Navy or gradient section, 1px hairline border, 2px corners, light edge plus `shadows.1`.
  - **On hover:** Seal Gold border and ring, `shadows.2`, a gold rule fading right along the top, and a gold, redrawn icon accent.
  - **Hover gate:** hover effects only apply for `(hover: hover) and (pointer: fine)`.
- **Registration marks:** the hover accent is four 10px corner ticks just outside the card, like crop marks on a verified document. They are a pseudo-element moving by opacity and inset only; the card box never moves.
- **Card link:** the whole card is the link, with a blue CTA row; used for policy documents.
- **Console:** a 4px floating panel with a navy title bar in mono and an "Illustrative" chip.
  - **Steps:** each row has an index chip, a label and a status: gold for done, blue and pulsing for in progress, muted with a dashed index for pending.
  - **Side panel:** lists the sanctions regimes screened.
  - **Content limit:** it may only show claims the site states elsewhere.

### Header and navigation
- **Header:** sticky, 72px, translucent navy with blur. Once scrolled it gains `shadows.header`.
- **Nav links:** a gold underline grows from the left on hover and stays visible on the current page.
- **Language switcher:** a `<details>` disclosure with a globe icon, the locale code and a chevron. The list is 2px-cornered, `shadows.popover`, and closes on Escape or an outside click.

### Inputs
- **Field:** visible label above, Raised Navy fill, 1px hairline, 2px corners, 48px minimum height, blue 2px focus outline. Placeholders show an example pattern and end with `…`.
- **Submit:** disabled until the Privacy Notice is published; the reason is shown under the button and linked with `aria-describedby`.

### Signature details
- **Jurisdiction clocks:** the hero's UK/CH/LU strip shows each office's real local time (mono, tabular, gold), formatted with `Intl` in the page locale and updated on the minute.
- **Dossier numbering:** content-section eyebrows read `§ 01 ——— LABEL`, numbered per page with a CSS counter, so each page reads as a structured dossier.

## Icons

**Set:** in-house inline SVG line-art on a 24px grid, outline, stroke 1.5, round caps and joins. There is no external library.

**Sizing:** 18px inline and in buttons, 24px by default, 32px in cards.

**Color:** `currentColor`. Cards tint the icon `ink-muted` at rest and `gold-strong` on hover.

- **Primary action** → arrow (shaft + head)
- **Download** → down arrow
- **Document** → folded page with two text lines
- **Compliance assurance** → shield with check
- **Language** → globe

**The One Set Rule.** No icon library is mixed in. A new icon is drawn on the same 24px grid at 1.5px.

**The Line-Art Rule.** No stock photography and no filled pictograms. The only fill exception is the aircraft, filled with the hero surface colour so it occludes the route under it.

**The Illustrative Label Rule.** Any mock interface carries a visible "Illustrative" chip and contains no invented figures, names or results.

## Do's and Don'ts

### Do:
- **Do** keep text on gold in `on-gold` (`#0a192f`); white on gold is 2.8:1 and fails.
- **Do** add every new layered background's worst case to `tools/contrast-check.mjs`.
- **Do** use 2px corners on controls, cards and chips; 4px only on floating panels.
- **Do** take every curve and duration from the motion tokens, in CSS and in JS (`tokens.js`).
- **Do** use tabular figures for indices and registration numbers.
- **Do** label any mock UI "Illustrative".

### Don't:
- **Don't** scale or translate an element on hover.
- **Don't** introduce pill-shaped buttons or 12px+ card radii. That is the playful fintech look this system rejects.
- **Don't** use camouflage, stencil type or decorative crosshairs. The aggressive military look is rejected.
- **Don't** add accent colours beyond gold and electric blue; the mesh fields stay inside the hero.
- **Don't** write a hex or rgb value in a component stylesheet; add or use a token.
- **Don't** let any reveal travel more than 12px or use an overshooting easing.

## Known Deviations (non-normative, to audit)

> This section is **not** normative. It lists where the current implementation departs from the rules above, for the audit backlog. Frontmatter values above are the canonical ones.

- **Background motion without an on-page pause control** (rule: WCAG 2.2.2 Pause, Stop, Hide, AA / actual: route dashes, aircraft flights, mesh drift and the console pulse loop indefinitely; only the OS reduced-motion setting stops them / locations: `hero.css` `.net-route` and `.hero__mesh`, `scripts/flights.js`, `process.css` `consolePulse` / occurrences: 4 loops / category: **accepted exception**, client decision 2026-11-18 to remove the pause button).
- **Vest chip can overlap content below 1400px** (rule: decorative layers never cover reading content / actual: 60px fixed chip bottom-right; it now steps aside while the footer is on screen, but can still sit over section content mid-page, and the round's trail crosses text for ~0.2s / location: `vest.css` `@media (max-width: 87.5rem)` / category: **to confirm** with the client: accept, or hide below 1400px).
- **Blur in the load animation is not compositor-only** (rule: animate transform and opacity only, Web Interface Guidelines / actual: `blurFocus` animates `filter: blur()` on the H1 and lead for 800ms / location: `tokens.css` `@keyframes blurFocus` / occurrences: 2 elements, once per load / category: **accepted exception**, the brief specified blur-to-focus).
