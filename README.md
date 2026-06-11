# convex-monorepo

Turborepo monorepo with a shared Convex backend, Next.js web app, and Expo mobile app.

## Structure

- `convex/` — Convex backend functions and schema
- `apps/web/` — Next.js web application
- `apps/mobile/` — Expo React Native mobile application
- `packages/` — Shared packages (`backend`, `types`, `utils`)

## Setup

1. Copy `.env.example` to `.env.local` and fill in your Convex and auth values.
2. Install dependencies:

```bash
bun install
```

3. Start the Convex dev server:

```bash
npx convex dev
```

4. Start all apps:

```bash
bun run dev
```

## Scripts

- `bun run dev` — Start all apps in development
- `bun run build` — Build all apps
- `bun run lint` — Lint all packages
- `bun run typecheck` — Type-check all packages
