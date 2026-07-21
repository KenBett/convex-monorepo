import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireAuthUserId } from "./auth";

export type MarketplaceRole = "farmer" | "buyer" | "driver";

export function getMarketplaceRole(
  user: Doc<"users"> | null,
): MarketplaceRole | undefined {
  if (
    user?.role === "farmer" ||
    user?.role === "buyer" ||
    user?.role === "driver"
  ) {
    return user.role;
  }
  return undefined;
}

export function isDriverUser(user: Doc<"users">): boolean {
  return user.role === "driver";
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
