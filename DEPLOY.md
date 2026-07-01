# Deploying the web app (Vunr)

Production URL: **https://vunr.vercel.app**

## Git auto-deploy (primary)

The Vercel project `vunr` is connected to this repo:

- **GitHub:** `KenBett/convex-monorepo`
- **Production branch:** `master`
- **Team:** `kenatohats-projects`

Every push to `master` triggers a production deployment. Pull requests get preview deployments.

### What Vercel runs

From the repo root (`vercel.json`):

```bash
bun install
bun run build --filter=@repo/web
```

Output is served from `apps/web/.next`. The monorepo root is required so workspace packages (`@repo/backend`, `@repo/types`, etc.) resolve correctly.

### Required Vercel environment variables (Production)

Set in [Vercel → vunr → Settings → Environment Variables](https://vercel.com/kenatohats-projects/vunr/settings/environment-variables):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (use **production** Convex when ready) |
| `NEXT_PUBLIC_APP_URL` | `https://vunr.vercel.app` |
| `OPENAI_API_KEY` | Buyer chat API route (`/api/buyer/sourcing`) |

Also configure in the **Convex dashboard** for the matching deployment:

- `SITE_URL` → `https://vunr.vercel.app` (OAuth redirects)

### Local CLI deploy (optional)

Only needed for one-off deploys without pushing to Git:

```bash
# From repo root (must have .vercel/project.json linked locally)
bunx vercel deploy --prod
```

Do not commit `.vercel/` — it is gitignored.

## Convex backend

Web deploys are independent of Convex. After schema/function changes:

```bash
bun run convex:dev   # local development only
bunx convex deploy   # production backend (when ready)
```

Then update `NEXT_PUBLIC_CONVEX_URL` on Vercel to the production Convex URL.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build can't find `@repo/backend` | Ensure deploy uses repo root, not `apps/web` alone |
| Missing `_generated/api` | `packages/backend/convex/_generated/` must be committed |
| Upload > 100 MB | `.vercelignore` excludes `node_modules`, `.next`, `apps/mobile` |
| Turbo env warning | Env vars listed in `turbo.json` → `globalEnv` |

Dashboard: https://vercel.com/kenatohats-projects/vunr
