# PROJECT_AUDIT — Virelle

**Дата:** 2026-07-12  
**Scope:** гибрид (сайт = boutique-опыт, покупка v1 → VK); identity evolve soft-feminine  
**Стек:** Vite 5 + HTML/SCSS/vanilla JS (без React/CMS)

---

# 1. Current Architecture

## Описание

Virelle — статический multi-page marketing site с клиентским каталогом-прототипом.

| Слой | Реализация |
|------|------------|
| Build | Vite 5, `index.html` + `catalog.html`, `base: './'` |
| Стили | SCSS → `src/styles/style.scss` → blocks; токены в `_variables.scss` |
| Логика | Один монолит `src/script.js` (~3100 строк), `window.*` для inline handlers |
| Данные | 77 SKU в JS-массиве; 8 карточек захардкожены в HTML лендинга |
| Тема | `data-theme="light\|dark"` + localStorage |
| Commerce | CTA → `vk.com/feed` (placeholder); нет PDP / cart / checkout / account |
| Deploy | Vercel ← `dist/`; CI коммитит `dist/` в git |

```
Desire path сегодня:
  Hero → Catalog (фильтры) → Quick View → VK (обрыв доверия)
Целевой гибрид:
  Hero → Collections → Catalog → PDP → Favorites? → VK group (v1)
```

## Сильные стороны

- Полный full-bleed hero с brand-first H1 (Cormorant + gold)
- Semantic token foundation (surfaces, text, gold/pink, spacing scale)
- Light/dark через semantic remap, не слепой invert
- Mobile touch targets (≥44px) в ключевых контролах
- Каталог: filter / sort / paginate / URL sync уже есть
- Design rules + UDP в `.cursor/rules/` — процессный каркас для агентов

## Слабые места

1. **Система объявлена, но не enforced** — токены type/radius/motion почти не используются в блоках
2. **Два источника правды о товарах** — HTML vs `catalogProducts` → drift
3. **Dead weight** — `_responsive.scss` ~5.6k строк, legacy `src/main.css`, dead carousel CSS/JS
4. **Assets в `dist/`, не в `public/`** — хрупкая сборка
5. **Нет PDP** — нет shareable URL, SEO по SKU, глубины storytelling
6. **Монолит JS** — landing тянет весь catalog runtime
7. **VK placeholder** — обрыв conversion path

**Системный диагноз:** это не «неправильная кнопка», а маркетинговый каркас с прототипом каталога, ещё не собранный как единая luxury design + content system.

---

# 2. Frontend Structure

## Компоненты и переиспользование

| Паттерн | Статус |
|---------|--------|
| Header / menu / theme / footer | Дублируются в обоих HTML (~400+ строк chrome+modals) |
| `.cta-button`, `.product-card`, `.section-header` | Есть, но параллельные кнопки (VK, quick-view, filter modal) |
| Size guide / calculator / quick-view modals | Скопированы 1:1 между страницами |
| Carousel / bestsellers / newsletter | SCSS+JS живы, HTML удалён (dead) |

## Дублирование

- Modal markup ×2 страницы
- Product data: 8 HTML cards ≠ catalog JS ids/names/prices
- `vercel.json` в root и `public/`
- Gradient recipe `gold→pink` copy-paste 10+ раз вместо одного utility/token

## Зависимости

- Runtime: нет npm-deps
- CDN: Font Awesome 6.4, Google Fonts (Cormorant + Montserrat)
- Images: hero/logo локально (в `dist/`); product photos — внешний GCP `uxpilot-auth`

## API / state

| Слой | Есть? |
|------|-------|
| API / CMS | Нет |
| fetch | Нет |
| localStorage | Только theme |
| Catalog state | In-memory filters/sort/page |

---

# 3. Design System Audit

## Colors

| Вопрос | Ответ |
|--------|-------|
| Система цветов? | Да: gold, pink, surfaces, text, glass, modal, badge |
| Semantic tokens? | Частично — хорошие `--color-bg-*` / `--color-text-*` |
| Хаос? | Да: 68+ HEX в `_catalog-page.scss`, 46 в `_responsive.scss`; Tailwind grays `#9ca3af` / `#6b7280` / `#d1d5db`; `#ef4444` без токена |
| Light theme drift | `--color-pink` === `--color-pink-light` (потеря атмосферы) |

## Typography

| Вопрос | Ответ |
|--------|-------|
| Font scale | `--text-xs`…`--text-hero` объявлены |
| Hierarchy | Cormorant display / Montserrat body — правильная идея |
| Consistency | ~400 raw `font-size`; ~8 использований `var(--text-*)`; ~107 hardcoded font-family vs ~12 `var(--font-*)` |
| Gaps | Нет line-height / font-weight tokens |

## Spacing

| Вопрос | Ответ |
|--------|-------|
| Единая система? | Scale 4–96px в variables |
| На практике | `var(--spacing-*)` ~179 раз; рядом `margin-bottom: 4rem`, `gap: 2rem` ad hoc |
| Container | 1440 / 1400 / 1320 / 1280 / 1200 — конфликт |

## Components

| Компонент | Оценка |
|-----------|--------|
| Buttons | `.cta-button` сильный; VK/quick-view/modal — параллельные системы |
| Cards | `.product-card` ok; hover scale = marketplace, не editorial |
| Forms | Sort/filters/newsletter — без shared field tokens |
| Modals | 3 оболочки почти-дубликаты |
| Header/nav | Работает; glass ok |
| Catalog chrome | Dashboard density (toolbar + sidebar + modal + pagination) |

## Radius / Motion / Elevation

- Radius tokens underused; modals `24px` вне scale
- Motion tokens ~9 uses vs ~100× `0.3s ease`
- Нет z-index / elevation scale; pink-glow shadows конкурируют с фото

## Responsive

- `_responsive.scss` ≈ 47% CSS; 14+ breakpoint values; mix min/max-width
- Dead: `.featured-categories`, `.catalog-hero` (нет в HTML)
- Не mobile-first consistently

---

# 4. UX Audit (поверхности)

### Home (`index.html`)

- **Цель:** бренд, желание, путь в каталог / VK
- **Сценарий:** hero → value → grid → categories → testimonials → about
- **Проблемы:** секции конкурируют; desire path размыт; product data drift; bestsellers/carousel удалены из HTML но «ожидаются» правилами
- **Доверие:** about + testimonials есть; VK notice purposeful
- **Конверсия:** CTA есть, но ведут на placeholder

### Catalog (`catalog.html`)

- **Цель:** выбрать товар
- **Сценарий:** фильтр → сетка → quick view → VK
- **Проблемы:** визуально «admin filters»; нет PDP; Tailwind UI tones; `updateFilterCount` не на `window` (module bug risk)
- **Доверие:** мало materials/care/size story на карточке
- **Конверсия:** обрыв на Quick View

### Отсутствующие страницы (gaps)

PDP, Cart, Checkout, Account, Favorites, Search, Policy pages — см. карту в `MIGRATION_ROADMAP.md`. Для гибрида v1 критичны **PDP + Favorites + реальный VK**; cart/checkout — later.

---

# 5. Premium Brand Audit

## Производит ли ощущение дорогого бутика?

**Частично на первом экране — нет как система.**

| Сигнал luxury | Сейчас |
|---------------|--------|
| Brand-first hero | Да |
| Editorial whitespace | Слабо после hero |
| Typography-first | Идея есть, enforcement нет |
| High-quality imagery | Hero ok; products = mock CDN |
| Stillness / restrained motion | Нет — gradient loops, badge pulse, ripple |
| Warm soft-feminine palette | Gold/pink есть; catalog = cold grays |
| Boutique density | Catalog = mass ecommerce chrome |

**Вердикт:** aspirational marketing site with DTC-theme habits — **not yet boutique luxury editorial commerce.**

Главный рычаг: не «перекрасить кнопку», а **собрать одну систему** (tokens enforced + single product truth + PDP desire path + soft-feminine atmosphere без шума).

---

## Связанные документы

- [DESIGN_SYSTEM_PLAN.md](./DESIGN_SYSTEM_PLAN.md)
- [UX_AUDIT.md](./UX_AUDIT.md)
- [MIGRATION_ROADMAP.md](./MIGRATION_ROADMAP.md)
