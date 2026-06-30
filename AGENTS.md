# Agent instructions — Offtake OS monorepo

## Stack

- **Backend:** Convex in `packages/backend/convex/`
- **Web:** Next.js 16 in `apps/web`
- **Mobile:** Expo 56 in `apps/mobile`
- **Shared:** `@repo/types`, `@repo/utils`, `@repo/backend`

## Convex

When working on Convex code, read `packages/backend/convex/_generated/ai/guidelines.md` first.

Use `bun run convex:dev` for development (not `convex deploy`).

Detailed Convex rules apply via `.cursor/rules/convex-project.mdc` when editing `packages/backend/convex/**`.

## Phased delivery

Follow `phase.md` in order. Do not skip ahead of the current phase "Done when" checklist.

## Cursor context

The Convex Cursor plugin rules are **disabled** in `.cursor/settings.json` to save context. Re-enable only if you need plugin MCP/hooks and accept ~25k extra rule tokens.
