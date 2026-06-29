import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireAuthUserId } from "./auth";

export type UserRole = "admin" | "member";

export function normalizeRole(user: Doc<"users"> | null): UserRole {
  return user?.role === "admin" ? "admin" : "member";
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

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (normalizeRole(user) !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}
