# MIGRATION_ROADMAP — Virelle

**Дата:** 2026-07-12  
**Режим:** PLAN MODE — каждая задача = отдельный этап  
**Scope:** гибрид (сайт + VK checkout v1) · soft-feminine evolve · Vite/HTML/SCSS/JS  
**Связанные:** [PROJECT_AUDIT.md](./PROJECT_AUDIT.md) · [DESIGN_SYSTEM_PLAN.md](./DESIGN_SYSTEM_PLAN.md) · [UX_AUDIT.md](./UX_AUDIT.md)

---

**Статус исполнения (2026-07-12):**

| Phase | Статус |
|-------|--------|
| TASK 001 docs | Done — `docs/strategy/*` |
| TASK 002 assets | Done — уже в `public/` |
| TASK 003 product data | Done — `src/data/products.js` |
| TASK 004 dead code | Done — carousel/newsletter/featured purged |
| TASK 005 VK URL | Placeholder kept in `src/config.js` (pet project) |
| TASK 006 filterCount | Done |
| TASK 010–012 tokens/shells | Done |
| TASK 011 HEX purge | Done (catalog/responsive/sections → tokens) |
| TASK 013 responsive | Done foundation — `_breakpoints.scss` + dead prune; legacy max-width debt remains |
| TASK 014 modal shell | Done — `src/partials/shared-modals.html` + inject |
| TASK 020–024 | Done skeleton — Home trust, Catalog search/title, PDP `product.html`, Favorites, Search |
| TASK 030–033 | Partial — trust strips, size on PDP, QV→PDP, scrollbar/a11y |
| TASK 040–043 | Partial — motion restraint on prices; image/perf backlog |

---

1. Не big-bang: один TASK за итерацию (или согласованный пакет Phase 1)
2. Перед кодом — pre-check; после — post-check + `npm run build`
3. Коммит/push — только по явной просьбе
4. Identity wholesale swap — запрещён; soft-feminine — в TASK 010
5. Cart/Checkout/Account on-site — вне горизонта до стабильного PDP + VK

---

# Карта страниц

| Страница | Цель | Проблемы | Приоритет | План улучшения |
|----------|------|----------|-----------|----------------|
| Home | Бренд + desire | Шум секций, data drift, VK placeholder | P0 | TASK 020 |
| Catalog | Выбор | Dashboard UI, нет PDP, gray tokens | P0 | TASK 021 |
| Product (PDP) | Эмоция + trust + VK CTA | Отсутствует | P0 | TASK 022 |
| Filters | Найти тип/размер | Утилитарный chrome | P1 | TASK 021 |
| Search | Быстрый поиск | Отсутствует | P1 | TASK 024 |
| Favorites | Сохранить желание | Отсутствует | P1 | TASK 023 |
| Collections | Курация | Только shop-by-category | P1 | TASK 020 |
| Quick View | Тизер | Сейчас = тупик commerce | P1 | TASK 032 |
| Cart / Checkout | Покупка on-site | Нет; VK v1 | P3 later | после hybrid |
| Account | Профиль | Нет | P3 later | — |
| Policy / trust | Снять страх | Нет | P1 | TASK 030 |
| Blog | Story | Нет | P3 | optional |

---

# PHASE 1 — Critical foundation

Фундамент без визуального «редизайна всего».

---

## TASK 001 — Strategy docs

| | |
|--|--|
| **Проблема** | Нет единой карты системы для постепенной трансформации |
| **Почему важно** | Без аудита любой редизайн = хаотичные патчи |
| **Эффект** | Общий язык, приоритеты, PLAN MODE |
| **Сложность** | S |
| **Зависимости** | — |
| **Pre-check** | Аудит architecture / tokens / pages |
| **Post-check** | Файлы в `docs/strategy/` |

**Статус:** выполняется первой волной.

---

## TASK 002 — Assets → `public/`

| | |
|--|--|
| **Проблема** | Hero/logo/favicon живут в `dist/`, не в `public/` |
| **Почему важно** | Clean build ломает бренд-ассеты |
| **Эффект** | Стабильная сборка, предсказуемый Vite pipeline |
| **Сложность** | M |
| **Зависимости** | — |
| **Pre-check** | Список файлов в `dist/` vs `public/` |
| **Post-check** | `npm run build`; hero/logo в новом `dist/` |

---

## TASK 003 — Single product data source

| | |
|--|--|
| **Проблема** | HTML cards ≠ `catalogProducts` в `script.js` |
| **Почему важно** | Drift цен/имён убивает доверие |
| **Эффект** | Один `src/data/products.js` (или JSON); index + catalog читают одно |
| **Сложность** | M |
| **Зависимости** | — |
| **Pre-check** | Сверить id 1–8 HTML vs JS |
| **Post-check** | Featured на home = subset каталога |

---

## TASK 004 — Dead code purge

| | |
|--|--|
| **Проблема** | Legacy `main.css`, dead carousel/featured CSS, orphan JS |
| **Почему важно** | Шум мешает миграции токенов и perf |
| **Эффект** | Меньше CSS/JS; ясная карта блоков |
| **Сложность** | M |
| **Зависимости** | — |
| **Pre-check** | Grep selectors vs HTML |
| **Post-check** | Build; визуально Home+Catalog без регрессий |

---

## TASK 005 — Real VK URLs

| | |
|--|--|
| **Проблема** | Все CTA → `vk.com/feed` |
| **Почему важно** | Максимальный обрыв доверия в момент конверсии |
| **Эффект** | Единый `--` / константа `VK_URL` → группа бренда |
| **Сложность** | S |
| **Зависимости** | **BLOCKER:** URL группы от владельца |
| **Pre-check** | Список всех `vk.com` ссылок |
| **Post-check** | Все CTA открывают бренд |

*Пока URL не дан — ввести `src/config.js` с `VK_URL` и одним местом правки; временно можно оставить placeholder с TODO.*

---

## TASK 006 — Fix `updateFilterCount` export

| | |
|--|--|
| **Проблема** | Inline `onchange="updateFilterCount()"` при ES module |
| **Почему важно** | Счётчик фильтров может молча ломаться |
| **Эффект** | `window.updateFilterCount = …` или убрать inline |
| **Сложность** | S |
| **Зависимости** | — |
| **Post-check** | Catalog filters count updates |

---

# PHASE 2 — Design system migration

---

## TASK 010 — Tokens v2 soft-feminine

| | |
|--|--|
| **Проблема** | Incomplete tokens; pink collapse on light; no LH/weight/elevation/z-index/error |
| **Почему важно** | Без v2 миграция блоков невозможна |
| **Эффект** | Soft blush palette + full semantic set обеих тем |
| **Сложность** | M |
| **Зависимости** | DESIGN_SYSTEM_PLAN |
| **Pre-check** | Inventory `_variables.scss` |
| **Post-check** | Spot-check light/dark без поломки layout |

---

## TASK 011 — Purge HEX / Tailwind grays

| | |
|--|--|
| **Проблема** | 100+ HEX в catalog/responsive; cold grays |
| **Почему важно** | Ломает soft-feminine и themes |
| **Эффект** | Blocks → `var(--color-*)` only |
| **Сложность** | M |
| **Зависимости** | TASK 010 |
| **Post-check** | Grep `#[0-9a-f]` в blocks ≈ 0 (кроме comments) |

---

## TASK 012 — Shells use type/radius/motion tokens

| | |
|--|--|
| **Проблема** | Tokens defined, ~95% ignored in header/buttons/cards |
| **Почему важно** | Consistency = premium |
| **Эффект** | Shared shells on tokens |
| **Сложность** | M |
| **Зависимости** | TASK 010 |
| **Post-check** | No hardcoded Cormorant/Montserrat in migrated files |

---

## TASK 013 — Slim `_responsive.scss`

| | |
|--|--|
| **Проблема** | 5.6k lines, duplicate breakpoints, dead selectors |
| **Почему важно** | Unmaintainable; blocks visual bugs |
| **Эффект** | Per-block responsive + `--bp-*` map; delete dead |
| **Сложность** | L |
| **Зависимости** | TASK 004, 011 |
| **Post-check** | Visual QA 375 / 768 / 1280 |

---

## TASK 014 — Shared modal shell + markup dedup

| | |
|--|--|
| **Проблема** | 3 near-duplicate modals × 2 pages |
| **Почему важно** | Drift a11y/styles; costly changes |
| **Эффект** | One shell pattern; reduce duplication (build includes or JS inject shared HTML) |
| **Сложность** | L |
| **Зависимости** | TASK 012 |
| **Post-check** | Size guide / calculator / QV / filters на обеих страницах |

---

# PHASE 3 — Core pages redesign

---

## TASK 020 — Home IA / desire path

| | |
|--|--|
| **Проблема** | Post-hero = noisy ecommerce |
| **Почему важно** | Первое впечатление не конвертируется в желание |
| **Эффект** | Editorial rhythm; collections → catalog; synced featured |
| **Сложность** | M |
| **Зависимости** | TASK 003 |
| **Post-check** | Hero budget; one primary path |

---

## TASK 021 — Catalog boutique density

| | |
|--|--|
| **Проблема** | Dashboard filters aesthetic |
| **Почему важно** | Премиум ≠ control panel |
| **Эффект** | Quieter chrome, warmer UI, card → PDP |
| **Сложность** | M |
| **Зависимости** | TASK 011, 022 (link target) |
| **Post-check** | Mobile + desktop scan path |

---

## TASK 022 — PDP v1

| | |
|--|--|
| **Проблема** | No product story / SEO / share URL |
| **Почему важно** | Центр hybrid conversion |
| **Эффект** | `product.html` (query id/slug): gallery, materials, size CTAs, VK, favorites |
| **Сложность** | L |
| **Зависимости** | TASK 003, 005 |
| **Post-check** | Deep link works; theme; mobile |

---

## TASK 023 — Favorites v1

| | |
|--|--|
| **Проблема** | Desire нельзя сохранить |
| **Почему важно** | Lingerie decisions are deferred |
| **Эффект** | localStorage favorites + UI |
| **Сложность** | M |
| **Зависимости** | TASK 003, 022 |
| **Post-check** | Persist across reload |

---

## TASK 024 — Search v1

| | |
|--|--|
| **Проблема** | Only filters |
| **Почему важно** | Scale inventory |
| **Эффект** | Client search by name/category |
| **Сложность** | M |
| **Зависимости** | TASK 003 |
| **Post-check** | Empty / hits states |

---

# PHASE 4 — UX improvements

---

## TASK 030 — Trust strips / policies

| | |
|--|--|
| **Проблема** | Страх доставки/возврата/заказа в VK |
| **Эффект** | Короткие strips на PDP/Home; optional static pages |
| **Сложность** | S–M |
| **Зависимости** | TASK 022 |

---

## TASK 031 — Size journey → PDP

| | |
|--|--|
| **Проблема** | Size tools orphaned from product |
| **Эффект** | Guide/calculator entry from PDP |
| **Сложность** | M |
| **Зависимости** | TASK 022, 014 |

---

## TASK 032 — Quick View = teaser

| | |
|--|--|
| **Проблема** | QV = dead-end |
| **Эффект** | Primary «Подробнее» → PDP; VK secondary |
| **Сложность** | S |
| **Зависимости** | TASK 022 |

---

## TASK 033 — A11y pass

| | |
|--|--|
| **Проблема** | Contrast gold/light; focus on filters; scrollbar hidden globally |
| **Эффект** | WCAG 2.2 closer; keyboard catalog |
| **Сложность** | M |
| **Зависимости** | TASK 010–012 |

---

# PHASE 5 — Premium polish

---

## TASK 040 — Motion restraint

Kill price/title gradient loops; ship 2–3 intentional motions; honor reduced-motion.

## TASK 041 — Image pipeline

Move off uxpilot mocks; local optimized product images strategy.

## TASK 042 — Editorial type polish

Display scale, RU measure, section rhythm.

## TASK 043 — Performance

Code-split catalog JS from landing; font check; LCP hero intact.

---

# Later (не блокирует Phase 1–3)

- On-site Cart / Checkout / Payment
- Account / orders
- CMS / API
- Blog / magazine

---

# Рекомендуемый порядок исполнения

```
001 docs
 → 002 assets → 003 data → 006 filterCount → 004 dead code → 005 VK
 → 010 tokens → 011 HEX purge → 012 shells → 004/013 responsive slim → 014 modals
 → 020 home → 022 PDP → 021 catalog → 032 QV → 023 fav → 024 search
 → 030 trust → 031 size → 033 a11y
 → 040–043 polish
```

---

# TASK template (копипаст)

```text
TASK NNN — Название

Перед изменением:
- Какие файлы затронуты
- Light/dark риски
- Зависимости от других TASK

После:
- Обновить токены/компоненты/страницы
- npm run build
- Visual: Home + Catalog (+ PDP) × light/dark × mobile
```


## Update — Phase 3–5 continue (2026-07-12)

| TASK | Статус |
|------|--------|
| 020 Home IA | Done — order: hero → categories → collection → vk → testimonials → trust → about; value/size-help merged |
| 021 Catalog boutique | Done — quieter toolbar, softer chrome |
| 030–033 | Done — trust+size CTAs, QV→PDP, focus-visible filters, scrollbar earlier |
| 040 motion | Done — infinite loops disabled; hero fade + solid gold title |
| 041 images | Backlog — still uxpilot GCP mocks |
| 042 type | Partial — display tokens on hero/section |
| 043 perf | Partial — page-gated catalog init; further code-split backlog |
