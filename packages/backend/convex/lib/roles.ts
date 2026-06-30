import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireAuthUserId } from "./auth";

export type MarketplaceRole = "farmer" | "buyer";

export function getMarketplaceRole(
  user: Doc<"users"> | null,
): MarketplaceRole | undefined {
  if (user?.role === "farmer" || user?.role === "buyer") {
    return user.role;
  }
  return undefined;
}

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const userId = await requireAuthUserId(ctx);
  const user = await ctx.db.get("users", userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}
