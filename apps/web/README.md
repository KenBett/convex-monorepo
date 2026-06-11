# HeroUI Web Template

A Next.js app template with HeroUI v3, a responsive shell (navbar + sidebar), theme switching, and Cursor rules for consistent UI work.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [HeroUI v3](https://heroui.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [next-themes](https://github.com/pacocoursey/next-themes)

## Quick start

### Clone the template

```bash
git clone https://github.com/KenBett/hero-ui-web-template.git my-app
cd my-app
```

### Install dependencies

```bash
bun install
```

### Run the dev server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Customize

| File | Purpose |
|------|---------|
| `config/site.ts` | App name and description |
| `config/navigation.ts` | Sidebar / nav routes |
| `config/theme.ts` | Theme options |
| `styles/globals.css` | Design tokens and theme variables |
| `constants/layout.ts` | Layout dimensions |

## Project structure

```
app/              # Routes (home, explore, profile)
components/       # Layout shell, page surfaces, theme UI
config/           # Site, navigation, fonts, theme
constants/        # Shared layout constants
styles/           # Global CSS and tokens
.cursor/rules/    # Cursor rules (surfaces, navigation, etc.)
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with Turbopack |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | ESLint with auto-fix |

## License

[MIT](./LICENSE)
