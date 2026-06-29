---
name: reduce-ui-bloat
description: >-
  Refactors screens into lean HeroUI component trees with minimal copy. Use when
  reducing UI bloat, splitting container vs presentational components, trimming
  explainer text, polishing feature pages, or making interfaces component-rich
  instead of text-heavy. Applies to apps/web (HeroUI React) and apps/mobile
  (HeroUI Native) in this monorepo. Global copy: ~/.cursor/skills/reduce-ui-bloat/
---

# Reduce UI Bloat

> **Global skill:** `~/.cursor/skills/reduce-ui-bloat/` (also `~/.agents/skills/reduce-ui-bloat/`). This project copy adds monorepo-specific paths and rules below.

Turn text-heavy screens into **component-rich, copy-light** interfaces. Logic stays in one container; everything visible becomes small reusable UI pieces built from the design system.

Read [reference.md](reference.md) for before/after examples from the Knowledge Explore refactor.

## When to Apply

- A screen has paragraphs explaining obvious actions
- One file mixes Convex hooks, handlers, and large JSX blocks
- Custom markup duplicates what HeroUI already provides (tabs, chips, alerts, empty states)
- Empty states, loading, or status UI are hand-rolled divs

## Workflow

```
Task progress:
- [ ] Audit copy — delete anything the UI already communicates
- [ ] Map sections — hero, primary panel, sidebar, admin, etc.
- [ ] Extract ui/ components — props in, JSX out, no data hooks
- [ ] Swap custom UI for HeroUI primitives
- [ ] Wire container — state, queries, mutations, handlers only
- [ ] Verify design rules — surfaces, no borders, default surface only
```

## 1. Split Container and UI

**Container** (e.g. `components/{feature}/{feature}-explore.tsx`):

- `"use client"` when needed
- Convex hooks (`useQuery`, `useMutation`, `useAction`)
- Local state and event handlers
- Composes UI components; almost no inline JSX beyond layout grid

**Presentational** (`components/{feature}/ui/*.tsx`):

- No Convex imports
- Typed props interface per component
- Shared types in `components/{feature}/types.ts`
- Shared helpers in `components/{feature}/utils.ts`

**Do not** co-locate feature components under `app/`. Keep routes thin.

### Target layout

```
components/{feature}/
├── {feature}-explore.tsx   # container
├── types.ts
├── utils.ts
└── ui/
    ├── explore-hero.tsx
    ├── command-deck.tsx
    ├── corpus-panel.tsx
    ├── knowledge-empty-state.tsx
    └── ...
```

Name components after **UI regions**, not implementation details (`CommandDeck`, not `SearchFormWrapper`).

## 2. Cut Copy Aggressively

Remove text that repeats visible structure. Prefer icons, labels, placeholders, and component affordances.

| Remove | Keep |
|--------|------|
| Page subtitle restating the title | Eyebrow + title (`text-eyebrow`, `text-display`) |
| "Search and ask questions across…" metadata | Page title only in `metadata` |
| Section paragraphs under headings | Section heading or icon + title |
| Empty-state helper paragraphs | Icon + one word (`Empty`, `No results`) |
| Button text like "Search the library" | Verb only: `Search`, `Ask`, `Upload`, `Index` |
| Status banner custom divs | HeroUI `Alert` with short message |

**Placeholders** carry input intent: `Search the library…`, `Ask a question…`, `Title`.

**Conditional empty states:** only show "No results" after the user acted (e.g. `hasSearched`), not on first paint.

## 3. Prefer HeroUI Over Custom Markup

Replace hand-built UI with library components. Add Lucide icons for section identity, not decoration spam.

| Need | HeroUI (web) | HeroUI Native (mobile) |
|------|--------------|------------------------|
| Grouped content | `Card` + `Card.Header` / `Card.Content` | `SurfaceCard` |
| Mode switch | `Tabs` | tabs pattern from design system |
| Search input | `SearchField` + `SearchField.Input` | inset field on surface |
| Text input | `Input`, `TextArea` `variant="secondary"` | `field-inset` inputs |
| Status message | `Alert` | surface + caption text |
| Tags / scores / status | `Chip` `variant="soft"` or `secondary` | nested surface chips |
| Loading list | `Skeleton` | pulse / skeleton loaders |
| Nothing to show | `EmptyState` or thin wrapper around it | `KnowledgeEmptyState`-style pattern |
| Primary action | `Button` `size="sm"` `variant="primary"` | `PremiumCtaButton` or `Button size="sm"` |

**Chip status colors:** use `variant="soft"` plus semantic text classes (`text-success`, `text-danger`, `text-muted`) — do not pass invalid dynamic `variant` values.

## 4. Design System (Non-Negotiable)

Follow monorepo rules while refactoring:

- **Surfaces only** — `bg-surface shadow-sm dark:shadow-none` on cards; canvas is `bg-background`
- **No borders** — no `border-*`, `ring-*`, separator lines; use spacing and nested `bg-default/45` rows
- **Default surface only** — never `bg-surface-secondary` / tertiary
- **Typography utilities** — `text-eyebrow`, `text-display`, `text-data`, `text-caption` (web: `globals.css`; mobile: `global.css`)
- **Focus** — `focus-visible:outline-none` + opacity or shadow, never rings
- **CTAs** — compact: `size="sm"`, rounded-full accent buttons for primary actions

Web: read `apps/web/.cursor/rules/default-surface.mdc` and `no-borders-surfaces-only.mdc`.  
Mobile: read `apps/mobile/.cursor/rules/design-system.mdc`.

## 5. Component Granularity

Extract when a region has its own heading, repeated pattern, or reuse potential:

- **Hero** — metrics in small `Card` tiles, not stat paragraphs
- **Primary panel** — tabs + forms + results (`CommandDeck`)
- **Sidebar** — list with skeleton loading (`CorpusPanel`)
- **Row primitives** — `DocumentRow`, `DocumentStatusChip`
- **Shared empty state** — one `KnowledgeEmptyState`-style wrapper
- **Admin block** — gated section with its own sub-panels

Keep each file focused. Pass callbacks down; never fetch in leaf components.

## 6. Loading and Feedback

- **Lists:** `Skeleton` placeholders (3–4 rows), not spinners
- **Buttons:** disable + progressive label (`Searching…`, `Thinking…`, `Indexing…`)
- **Transient success/error:** single `statusMessage` string → one `Alert`, auto-clear after timeout
- **Busy state:** one `busyState` string key (`"search"`, `"ask"`, `"delete:${id}"`)

## 7. Page Shell

Route file stays minimal:

```tsx
export const metadata: Metadata = {
  title: "Knowledge",
};

export default function ExplorePage() {
  return <KnowledgeExplore />;
}
```

No marketing copy in the route. No duplicate headers in metadata.

## Checklist Before Finishing

- [ ] Container file has no large JSX blocks (only composition + layout grid)
- [ ] All feature UI lives under `components/{feature}/ui/`
- [ ] No paragraph explainer under section titles
- [ ] HeroUI used for tabs, inputs, chips, alerts, skeletons, empty states
- [ ] Empty search/results only after user action where appropriate
- [ ] Surfaces/shadows only — no borders or rings
- [ ] Typecheck touched files (`bunx tsc --noEmit` in app package if needed)
- [ ] Do not run production build unless user asks

## Reference Implementation

Canonical example in this repo:

- Container: `apps/web/components/knowledge/knowledge-explore.tsx`
- UI: `apps/web/components/knowledge/ui/`
- Route: `apps/web/app/(app)/explore/page.tsx`

Use it as the template for the next feature refactor.
