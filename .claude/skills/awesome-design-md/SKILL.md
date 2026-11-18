---
name: awesome-design-md
description: Library of 84 ready-made DESIGN.md files (design tokens, typography, components, rules) extracted from real sites (Apple, Airbnb, Claude, Stripe, Linear, Vercel, etc.). Use when the user wants UI "in the style of" a known brand, asks to pick/copy a DESIGN.md, or wants a project's design language set from a reference. Source VoltAgent/awesome-design-md.
---

# Awesome DESIGN.md

Each `brands/<name>/DESIGN.md` is a design-system spec. Most have YAML frontmatter (colors, typography, spacing, radii, components) plus prose rules; ~10 (kraken, lamborghini, lovable, mastercard, runwayml, sanity, spotify, starbucks, tesla, theverge) are prose-only with numbered sections. Read it, then build UI that follows it.

## Workflow
1. List brands: `ls .claude/skills/awesome-design-md/brands`.
2. Pick the brand the user named, or propose 2-3 matches by mood if they only described a vibe (grep `description:` in the DESIGN.md frontmatter).
3. Read the full `brands/<name>/DESIGN.md`.
4. If the user wants it as the project's design language: copy it to the project root as `DESIGN.md` and reference it from CLAUDE.md/AGENTS.md ("UI must follow DESIGN.md").
5. Build with the tokens exactly (hex values, font stacks, radii, spacing). Map them to CSS variables or the Tailwind theme. Don't invent colors outside the file.
6. Fonts: DESIGN.md names proprietary fonts (e.g. SF Pro); use the fallback stack it lists or a close open font, and say so.

## Notes
- Specs are third-party analyses of public sites, for style reference. Don't copy logos, trademarks or copy text.
- Mixing brands: pick one as the base, borrow only isolated elements.
