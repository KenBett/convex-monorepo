# Agent guidelines — Hero UI Native starter

Use this template's UI conventions when adding screens or components.

**Canonical design system:** [`.cursor/rules/design-system.mdc`](.cursor/rules/design-system.mdc) (always-on). Supplement: [`.cursor/rules/default-surfaces-only.mdc`](.cursor/rules/default-surfaces-only.mdc).

## Stack

- **UI:** `heroui-native` (not `@heroui/react`)
- **Styling:** Uniwind / Tailwind v4 via root [`global.css`](global.css)
- **Routing:** Expo Router under `src/app/`
- **Package manager:** Bun only (`bun install`, `bun run start`)

## Required patterns

1. **Screens** — Wrap tab screens in `ScreenShell` from `@/components/screen-shell`. Use `scrollable={false}` when the main content is a `FlashList`.
2. **Surfaces** — Group content with `SurfaceCard` (default surface only), not raw gray backgrounds.
3. **Typography** — Use semantic utilities (`text-page-title`, `text-section-title`, `text-emphasis`, `text-caption`) or `SectionTitle`.
4. **CTAs** — Inline/dialog triggers use `PremiumCtaButton` or `Button size="sm"`, not default `md`.
5. **Tabs** — Keep `PremiumTabBar` (icon-only). When adding a tab, update `TAB_ICONS` in `premium-tab-bar.tsx` and `(tabs)/_layout.tsx`.
6. **Dialogs** — Always use `DialogBlurOverlay` inside `Dialog.Portal` (see `example-dialog.tsx`).
7. **Colors** — Semantic tokens only (`bg-background`, `text-foreground`, `text-muted`, `bg-surface`, `bg-accent`). Customize in `global.css`.
8. **Theme** — Use `useAppTheme()` / `useThemePreference()`. Do not call `Uniwind.setTheme` directly except in the theme context.

## Typography utilities

| Class | Use for |
|-------|---------|
| `text-page-title` | Screen header, page hero |
| `text-section-title` | Section headings (`SectionTitle`) |
| `text-emphasis` | Price, highlight lines |
| `text-caption` | Supporting copy, meta |
| `text-cta-label` | Primary button labels |

## Spacing utilities

| Class | Use for |
|-------|---------|
| `px-screen-x` / `pt-screen-top` / `pb-screen-bottom` | Screen padding (via `ScreenShell`) |
| `gap-section` | Between major blocks |
| `gap-section-title` | Section title + content wrapper |
| `p-card` / `p-card-lg` | Card internal padding |
| `min-h-touch` / `min-w-touch` | 44px touch targets |

## File layout

- Routes: `src/app/`
- Shared UI: `src/components/`
- Hooks: `src/hooks/`
- App config / mock data: `src/constants/`
- Do not co-locate components inside `src/app/`

## Customization on reclone

| What | Where |
|------|--------|
| Colors, type scale, spacing, shadows | `global.css` |
| App name, storage keys, avatar initials | `src/constants/app-config.ts` |
| Slug, scheme, icons, splash | `app.json` + `assets/images/` |
| Tab icons | `src/components/premium-tab-bar.tsx` |

Keep shared primitives (`ScreenShell`, `SurfaceCard`, `PremiumTabBar`, etc.) unchanged — only tokens and app identity change per project.

## Checklist before finishing UI work

- [ ] Screen uses `ScreenShell` (or justified `scrollable={false}` for lists)
- [ ] Grouped blocks use `SurfaceCard` with `p-card` where appropriate
- [ ] Headings use typography utilities or `SectionTitle`
- [ ] Inline CTAs use `PremiumCtaButton` or `Button size="sm"`
- [ ] New dialogs include `DialogBlurOverlay`
- [ ] New tabs update `TAB_ICONS` and `(tabs)/_layout.tsx`
- [ ] No hardcoded hex colors in components
