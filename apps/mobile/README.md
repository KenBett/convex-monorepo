# Hero UI Native — Mobile starter template

Expo + HeroUI Native + Uniwind starter with a premium monochrome design system, custom tab bar, theme persistence, and UI pattern examples.

## Get started

```bash
bun install
bun run start
```

Open in Expo Go, a development build, or a simulator.

## What's included

### Stack

- [HeroUI Native](https://heroui.com/docs/native) + [Uniwind](https://docs.uniwind.dev) (Tailwind v4 for React Native)
- [Expo Router](https://docs.expo.dev/router/introduction) with bottom tabs + modal search route
- Geist font loading via `@expo-google-fonts/geist`
- Theme preference: **System / Light / Dark** (persisted with AsyncStorage)

### Design primitives

| Component | Path | Use for |
|-----------|------|---------|
| `ScreenShell` | `src/components/screen-shell.tsx` | Tab screens (header + scroll). Set `scrollable={false}` for `FlashList` screens. |
| `SurfaceCard` | `src/components/surface-card.tsx` | Grouped panels with surface variants |
| `PremiumCtaButton` | `src/components/premium-cta-button.tsx` | Compact primary CTAs |
| `DialogBlurOverlay` | `src/components/dialog-blur-overlay.tsx` | Blur + dim behind dialogs |
| `EmptyState` | `src/components/empty-state.tsx` | Icon + title + description + optional CTA |
| `PremiumTabBar` | `src/components/premium-tab-bar.tsx` | Icon-only bottom tabs |

### Example screens

- **Home** — UI patterns showcase (typography, surfaces, buttons, forms, skeletons, dialog, empty state)
- **Explore** — `FlashList`, pull-to-refresh, filter bottom sheet, empty state toggle
- **Profile** — System / Light / Dark theme picker
- **Search** — Full-screen modal with `SearchField`

## Customize this template

1. **Brand colors** — Edit semantic tokens in [`global.css`](global.css) (`--accent`, `--background`, `--surface-*`).
2. **App identity** — Update [`src/constants/app-config.ts`](src/constants/app-config.ts) (name, avatar initials).
3. **Expo config** — Change slug, scheme, and icons in [`app.json`](app.json). Replace placeholders in `assets/images/`.
4. **Tabs** — Add routes under `src/app/(tabs)/` and extend `TAB_ICONS` in [`premium-tab-bar.tsx`](src/components/premium-tab-bar.tsx).

## Scripts

```bash
bun run start      # Expo dev server
bun run ios        # iOS simulator
bun run android    # Android emulator
bun run typecheck  # TypeScript
bun run lint       # ESLint
```

## UI conventions

Full design system rules: [`AGENTS.md`](AGENTS.md) and [`.cursor/rules/design-system.mdc`](.cursor/rules/design-system.mdc). Covers semantic tokens, typography/spacing utilities, `ScreenShell`, dialog blur, and icon-only tab bar.

## Learn more

- [HeroUI Native docs](https://heroui.com/docs/native)
- [Uniwind docs](https://docs.uniwind.dev)
- [Expo docs](https://docs.expo.dev/)
"# hero-native-template" 
