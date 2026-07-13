# DESIGN_SYSTEM_PLAN — Virelle Tokens v2

**Дата:** 2026-07-12  
**Identity:** evolve soft-feminine (gold + blush + warm neutrals; Cormorant + Montserrat)  
**Стек токенов:** CSS custom properties в `_variables.scss` (без Style Dictionary на v1)  
**Внешний стандарт:** DTCG 2025.10 principles — primitive → semantic → (optional) component; код ссылается на semantic, не на сырой HEX

---

# 1. Brand principles

1. **Boutique, not marketplace** — курация, воздух, один job на секцию
2. **Feminine softness** — blush / nude / champagne; никакого neon pink и cold Tailwind gray
3. **Brand metal = gold** — CTA и brand moments; не заливать всё золотом
4. **Atmosphere = blush** — glass, soft borders, hover air — не large fills
5. **Photography leads** — UI не конкурирует с телом/тканью
6. **Stillness by default** — motion только с намерением
7. **One system, two themes** — light/dark semantic remap; gold стабилен

---

# 2. Visual direction

> Soft editorial lingerie boutique: warm ivory and charcoal surfaces, champagne-gold accents, blush atmosphere, serif display intimacy, quiet UI chrome.

**Avoid:** purple SaaS glow, broadsheet density, animated gradient text spam, badge clusters, dashboard filters aesthetic.

**Reference feeling:** luxury lingerie lookbook + intimate boutique — not Shopify starter theme.

---

# 3. Color philosophy

## Tier model (DTCG-aligned)

```
Primitive (internal)     Semantic (use in UI)        Component (sparingly)
─────────────────────    ─────────────────────────   ────────────────────
gold.500                 color.accent / text.accent  button.solid.bg
blush.300 / blush.400    color.atmosphere            card.border
ivory.50 / charcoal.800  bg.primary / text.primary   modal.overlay
```

В SCSS v2 **не обязательно** выносить primitives в отдельный JSON; достаточно комментированных групп в `_variables.scss`. Блоки используют только semantic `--color-*`.

## Soft-feminine palette (целевые роли)

| Role | Dark theme | Light theme | Notes |
|------|------------|-------------|-------|
| Brand gold | `#d4af37` (stable) | same / slightly warmer champagne on large fills | CTA, H1 brand, premium edges |
| Atmosphere blush | soft rose, lower chroma than `#ffc0cb` | dusty blush `#e8b4bc`–`#f2c4cc` | glass, borders — not page fills |
| Blush light | distinct from blush | **must differ** from blush (fix current collapse) | |
| Surface primary | warm charcoal `#2b2b2b` | soft ivory `#faf8f6` (not sterile `#fff` only) | |
| Surface secondary | deeper warm black | soft white / warm gray | |
| Text primary | near-white warm | near-charcoal warm | |
| Text muted | warm mauve-gray | warm taupe | **never** `#9ca3af` / `#6b7280` |
| Success | soft sage | deeper sage | |
| Error | muted rose-red (not `#ef4444` loud) | same family | |
| Focus | gold ring with contrast | gold / charcoal | |

## Rules

- No HEX in `blocks/` when a token exists
- No Tailwind neutral imports
- Pink is atmosphere, not chrome paint
- Validate WCAG 2.2 contrast on both themes (esp. gold on light)

---

# 4. Typography

## Families (fixed)

| Role | Font |
|------|------|
| Display / brand / headings | Cormorant Garamond |
| Body / UI / controls | Montserrat |

Tokens: `--font-display`, `--font-body` — **обязательны** в блоках (запрет hardcoded family).

## Roles & scale

| Role | Token size | Weight | Line-height |
|------|------------|--------|-------------|
| Hero brand | `--text-hero` | 300–400 | tight |
| Hero support | `--text-hero-sub` | 300 | snug |
| Section H2 | `--text-3xl` / `--text-4xl` | 400 | tight |
| Section support | `--text-lg` | 400 | comfortable |
| Product name | `--text-xl` | 400–500 | snug |
| Body | `--text-base` | 400 | `--leading-body` |
| Caption / meta / price | `--text-sm` | 400–500 | `--leading-tight` |
| Overline / badge | `--text-xs` | 500–600 | tight; uppercase sparingly |

New tokens to add:

```scss
--font-weight-light: 300;
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--leading-tight: 1.2;
--leading-snug: 1.35;
--leading-body: 1.6;
--tracking-display: 0.02em;
--tracking-ui: 0.04em; /* badges only */
```

RU: line length ~45–75ch for body; avoid orphan brand wrap on mobile.

---

# 5. Components architecture

## Shared primitives (оба page)

1. **Button** — `.cta-button` + variants solid / outline / ghost / vk (extends, not fork)
2. **ProductCard** — image, name, price, optional badge; hover = soft lift, not scale(1.1) circus
3. **SectionHeader** — title + subtitle only
4. **ModalShell** — overlay + panel + close + scroll lock (size-guide, quick-view, filters)
5. **FilterChip / Field** — shared focus, border, radius tokens
6. **Header / Menu / Footer** — single markup source long-term (include or build step)

## States (все interactive)

default / hover (pointer) / focus-visible / active / disabled  
Touch ≥ `--touch-min` (44px)

## Anti-patterns to retire

- Parallel VK button systems that don't extend `.cta-button`
- Animated gradient on prices/titles
- Promo badge uppercase spam
- Quick-view as final commerce step (→ teaser to PDP)

---

# 6. Layout rules

| Rule | Spec |
|------|------|
| Container | один `--container-max` (напр. 1440px); убрать 5 конкурирующих max-width |
| Section | `--section-padding-y` / mobile; one H2 + one support |
| Grid | product grid gap = `--card-gap` |
| Hero | full-bleed only; brand + promise + one CTA cluster; no overlays/chips/stats |
| Catalog | lookbook density; filters as quiet chrome |
| Breakpoints | mobile-first map: `--bp-sm: 640px`, `--bp-md: 768px`, `--bp-lg: 1024px`, `--bp-xl: 1280px`, `--bp-2xl: 1440px` |

---

# 7. Animation principles

1. Prefer `opacity` + `transform`
2. Duration: `--motion-fast|base|slow` only
3. Easing: `--ease-out` / `--ease-standard`
4. **No infinite loops** on LCP / prices / titles (kill `gradientShift`, `priceGradient` loops)
5. Allow: subtle hero fade-in, card hover lift, modal enter
6. Always respect `prefers-reduced-motion` (global + no `will-change` spam)

---

# 8. Image principles

1. Hero: local optimized assets in `public/`; preload LCP
2. Products: eventually local brand photography; leave GCP mocks as temporary with clear debt flag
3. Aspect ratios consistent per card type
4. Meaningful `alt` (RU), never empty for product
5. No decorative collage competing with hero
6. Dark/light hero swap already exists — keep

---

# 9. Spacing / radius / elevation / z-index (v2 additions)

## Spacing (enforce)

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96`  
Add `--spacing-12: 0.75rem` if needed for 12px gap between sm/md.

## Radius

```scss
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px; /* modals only */
--radius-full: 9999px; /* avoid for premium; pills sparingly */
```

## Elevation

```scss
--shadow-sm: … soft;
--shadow-md: …;
--shadow-lg: …;
--shadow-focus: 0 0 0 3px … gold/atmosphere;
```

Pink glow shadows — optional atmosphere, not default card elevation.

## Z-index

```scss
--z-header: 50;
--z-overlay: 1000;
--z-modal: 2000;
--z-toast: 3000;
--z-skip: 4000;
```

---

# 10. Implementation order (see MIGRATION_ROADMAP)

1. TASK 010 — extend `_variables.scss` (both themes)
2. TASK 011 — purge HEX / Tailwind grays from catalog + responsive
3. TASK 012 — migrate shells to type/radius/motion tokens
4. TASK 013 — breakpoint consolidation
5. TASK 014 — modal shell unification

**Правило:** сначала токены обеих тем → потом блоки → потом visual QA light/dark.


---

# Tokens v3 — Quiet Luxury (2026-07-12)

**Locked:** light-only · ivory `#f7f4ef` · charcoal `#1c1b1a` · champagne `#b8956c` · **no pink** · no dark theme.

Radius 2/4/8 · more section air · flat buttons · cards without chrome · motion opacity-only.
