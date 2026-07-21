import { v } from "convex/values";

import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "../_generated/server";
import { GLOBAL_NAMESPACE, rag } from "../lib/rag";

const wipeStatsValidator = v.object({
  authAccounts: v.number(),
  authRateLimits: v.number(),
  authRefreshTokens: v.number(),
  authSessions: v.number(),
  authVerificationCodes: v.number(),
  authVerifiers: v.number(),
  buyerProfiles: v.number(),
  drives: v.number(),
  farmerProfiles: v.number(),
  listings: v.number(),
  orders: v.number(),
  storageFiles: v.number(),
  users: v.number(),
});

type WipeTable =
  | "drives"
  | "orders"
  | "listings"
  | "farmerProfiles"
  | "buyerProfiles"
  | "users"
  | "authRefreshTokens"
  | "authSessions"
  | "authVerificationCodes"
  | "authVerifiers"
  | "authRateLimits"
  | "authAccounts";

async function deleteAllInTable(
  ctx: MutationCtx,
  table: WipeTable,
): Promise<number> {
  // eslint-disable-next-line @convex-dev/no-query-collect -- one-off wipe of bounded demo data
  const rows = await ctx.db.query(table).collect();
  for (const row of rows) {
    await ctx.db.delete(table, row._id as never);
  }
  return rows.length;
}

function assertDevWipeAllowed(): void {
  if (process.env.ALLOW_DEV_WIPE !== "true") {
    throw new Error(
      "Dev wipe disabled. Set Convex env ALLOW_DEV_WIPE=true, run once, then remove it.",
    );
  }
}

/**
 * Deletes marketplace + auth documents and listing images.
 * RAG entries are cleared by wipeDevDeployment (action).
 */
export const wipeAppTables = internalMutation({
  args: {},
  returns: wipeStatsValidator,
  handler: async (ctx) => {
    assertDevWipeAllowed();

    const drives = await deleteAllInTable(ctx, "drives");
    const orders = await deleteAllInTable(ctx, "orders");

    // eslint-disable-next-line @convex-dev/no-query-collect -- one-off wipe
    const listings = await ctx.db.query("listings").collect();
    let storageFiles = 0;
    for (const listing of listings) {
      if (listing.imageStorageId) {
        try {
          await ctx.storage.delete(listing.imageStorageId);
          storageFiles += 1;
        } catch {
          // Image may already be gone.
        }
      }
      await ctx.db.delete("listings", listing._id);
    }

    const farmerProfiles = await deleteAllInTable(ctx, "farmerProfiles");
    const buyerProfiles = await deleteAllInTable(ctx, "buyerProfiles");

    const authRefreshTokens = await deleteAllInTable(ctx, "authRefreshTokens");
    const authSessions = await deleteAllInTable(ctx, "authSessions");
    const authVerificationCodes = await deleteAllInTable(
      ctx,
      "authVerificationCodes",
    );
    const authVerifiers = await deleteAllInTable(ctx, "authVerifiers");
    const authRateLimits = await deleteAllInTable(ctx, "authRateLimits");
    const authAccounts = await deleteAllInTable(ctx, "authAccounts");
    const users = await deleteAllInTable(ctx, "users");

    return {
      authAccounts,
      authRateLimits,
      authRefreshTokens,
      authSessions,
      authVerificationCodes,
      authVerifiers,
      buyerProfiles,
      drives,
      farmerProfiles,
      listings: listings.length,
      orders,
      storageFiles,
      users,
    };
  },
});

export const wipeRagNamespace = internalAction({
  args: {},
  returns: v.object({ deletedEntries: v.number() }),
  handler: async (ctx): Promise<{ deletedEntries: number }> => {
    assertDevWipeAllowed();

    const namespace = await rag.getNamespace(ctx, {
      namespace: GLOBAL_NAMESPACE,
    });
    if (!namespace) {
      return { deletedEntries: 0 };
    }

    let deletedEntries = 0;
    let cursor: string | null = null;
    for (;;) {
      const listResult = await rag.list(ctx, {
        namespaceId: namespace.namespaceId,
        paginationOpts: { cursor, numItems: 100 },
      });

      for (const entry of listResult.page) {
        await rag.delete(ctx, { entryId: entry.entryId });
        deletedEntries += 1;
      }

      if (listResult.isDone) {
        break;
      }
      cursor = listResult.continueCursor;
    }

    return { deletedEntries };
  },
});

/**
 * One-shot: clear RAG, then wipe all app + auth tables.
 * Requires ALLOW_DEV_WIPE=true. Remove the env var after running.
 *
 * From packages/backend:
 * bunx convex env set ALLOW_DEV_WIPE true
 * bunx convex run internal.dev.wipeDevDeployment.wipeDevDeployment
 * bunx convex env remove ALLOW_DEV_WIPE
 */
export const wipeDevDeployment = internalAction({
  args: {},
  returns: v.object({
    rag: v.object({ deletedEntries: v.number() }),
    tables: wipeStatsValidator,
  }),
  handler: async (
    ctx,
  ): Promise<{
    rag: { deletedEntries: number };
    tables: {
      authAccounts: number;
      authRateLimits: number;
      authRefreshTokens: number;
      authSessions: number;
      authVerificationCodes: number;
      authVerifiers: number;
      buyerProfiles: number;
      drives: number;
      farmerProfiles: number;
      listings: number;
      orders: number;
      storageFiles: number;
      users: number;
    };
  }> => {
    assertDevWipeAllowed();

    const ragStats: { deletedEntries: number } = await ctx.runAction(
      internal.dev.wipeDevDeployment.wipeRagNamespace,
      {},
    );
    const tables = await ctx.runMutation(
      internal.dev.wipeDevDeployment.wipeAppTables,
      {},
    );

    return { rag: ragStats, tables };
  },
});
