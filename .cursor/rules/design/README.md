# Design Rules — Virelle

Как пользоваться design rules вместе с Cursor Docs.

Одна фраза: **токены + блоки** говорят *как сделано у нас*; **rules** говорят *как агенту работать*; **Docs** — *как делают хорошо* (принципы).

---

## Карта файлов

| Файл | Когда | Роль |
|------|--------|------|
| `design-system.mdc` | always | Ядро: принципы, токены, layout, components, a11y, motion |
| `project-style.mdc` | always | Идентичность Virelle, reuse, без слепого redesign |
| `full-redesign.mdc` | по `@` / явный запрос | Полный редизайн: intake → стратегия → волны |
| `color-system.mdc` | по `@` / description | Gold/pink, themes, contrast |
| `typography-system.mdc` | по `@` / description | Cormorant / Montserrat, hierarchy |
| `ui-review.mdc` | по `@` / description | Чеклист аудита (инкремент) |

Связанный процессный регламент: `../universal-development-protocol.mdc` (UDP).

### Когда что

| Задача | Правило |
|--------|---------|
| Правка секции / токена / бага UI | `design-system` + specialist при необходимости |
| Аудит без смены языка сайта | `ui-review` (+ color/typography) |
| **Полный редизайн** | **`full-redesign`** |

---

## Слои источников

| Слой | Что | Как подключать |
|------|-----|----------------|
| **Product truth** | `_variables.scss`, `src/styles/blocks/`, `index.html`, `catalog.html` | `@` на файлы |
| **Process** | `.mdc` в этой папке | `@`-mention / alwaysApply |
| **External standards** | Apple HIG, Material 3, WCAG 2.2, W3C Tokens | `@Docs` |
| **Library API** | Vite, Sass | Context7 (только при реализации) |

**Не в стеке:** Astro, React, shadcn/ui, Radix, Tailwind-as-system — не мигрировать UI на них без запроса.

При расхождении rules ↔ код — **токены/блоки в коде** + явное имя drift.

---

## Иерархия при конфликте

1. Product identity — `project-style.mdc` + `_variables.scss` + blocks  
   *(при полном редизайне: утверждённое Phase 2 из `full-redesign.mdc` может эволюционировать identity)*
2. Process — `design-system.mdc` + specialists + `ui-review` / `full-redesign`
3. UDP — `.cursor/rules/universal-development-protocol.mdc`
4. External Docs — `@Docs` (принципы)
5. Context7 — только когда пишем код под конкретный API

---

## Флоу

**Аудит (ui-review)**  
Фаза A — Analysis only → отчёт → план. Код не трогать.  
Фаза B — Implement по утверждённому плану.

Приоритет: usability → accessibility → consistency → visual → polish.

**Полный редизайн (full-redesign)**  
Phase 0 Scope → Phase 1 Discovery → Phase 2 Proposal → **стоп на approve** → Phase 3 Implement волнами (tokens → shells → sections → polish).

---

## Промпты (копипаст)

### A — Полный UI/UX аудит (только анализ)

```text
@.cursor/rules/design/ui-review.mdc
@.cursor/rules/design/color-system.mdc
@.cursor/rules/design/typography-system.mdc
@Docs

Проведи полный UI/UX аудит сайта Virelle.

Источники (по приоритету):
1. Product truth — src/styles/base/_variables.scss, src/styles/blocks/, index.html, catalog.html
2. Process — design rules (ui-review + specialists)
3. External standards via Docs — Apple HIG, Material Design 3, WCAG 2.2, W3C Design Tokens

Фаза: только анализ. Код не менять.

Формат ответа строго по ui-review:
- Current State
- Problems (Critical → High → Medium → Low)
- Recommendations (problem / why / change / UX gain)
- Implementation Plan (usability → a11y → consistency → visual → polish)
```

### B — Внедрение после аудита

```text
@.cursor/rules/design/ui-review.mdc
@Docs

Внедряй улучшения из утверждённого плана аудита.
Только приоритет [Critical|High] / пункт [N].
Сохраняй identity Virelle (gold/pink, Cormorant/Montserrat, full-bleed hero).
Без нового redesign.
После правок — короткий diff-summary и что осталось.
```

### C — Узкий фокус

**Только цвет:**

```text
@.cursor/rules/design/color-system.mdc
@Docs

Аудит цветовой системы Virelle. Только анализ, код не менять.
Формат: Current State → Problems (Critical→Low) → Recommendations → Plan.
```

**Только типографика:**

```text
@.cursor/rules/design/typography-system.mdc
@Docs

Аудит типографики Virelle (Cormorant Garamond / Montserrat). Только анализ, код не менять.
Формат: Current State → Problems (Critical→Low) → Recommendations → Plan.
```

**Один экран / секция:**

```text
@.cursor/rules/design/ui-review.mdc
@Docs

UI/UX аудит секции [Hero|Featured|Bestsellers|Catalog|…] / страницы [index|catalog].
Только анализ, код не менять. Формат строго по ui-review.
```

### D — Полный редизайн

Сначала анализ и предложение — без кода, пока не утвердишь план:

```text
@.cursor/rules/design/full-redesign.mdc
@.cursor/rules/design/design-system.mdc
@.cursor/rules/design/color-system.mdc
@.cursor/rules/design/typography-system.mdc
@.cursor/rules/design/ui-review.mdc
@Docs

Ты senior product designer + frontend architect. Проведи полный редизайн сайта Virelle.

Обязательный intake:
1. src/styles/base/_variables.scss, src/styles/blocks/, index.html, catalog.html, src/script.js
2. design rules в .cursor/rules/design/
3. External standards via @Docs — принципы, не копировать UI kit

Scope:
- Страницы: [landing only | + catalog]
- Identity: [эволюционировать gold/pink + Cormorant/Montserrat | новое направление: …]
- Фаза: только Discovery + Proposal (код не менять), пока я не утвержу план

Формат строго по full-redesign:
Phase 1 — Current system, drift, Problems, Opportunities
Phase 2 — Design direction, IA/sections, system deltas, key screens, risks, waves
```

После approve:

```text
@.cursor/rules/design/full-redesign.mdc
@Docs

Внедряй утверждённый план полного редизайна.
Только волна [N]: [foundation tokens | shells | Hero | catalog | …].
Соблюдай hard constraints из full-redesign (Vite static, без UI-kit миграции).
После волны — diff-summary и список оставшегося.
```
