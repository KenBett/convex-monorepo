import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./lib/auth";
import { normalizeRole } from "./lib/roles";

const roleValidator = v.union(v.literal("admin"), v.literal("member"));

const viewerValidator = v.union(
  v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: roleValidator,
  }),
  v.null(),
);

export const viewer = query({
  args: {},
  returns: viewerValidator,
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (!user) {
      return null;
    }
    return withNormalizedRole(user);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const updates: Partial<Doc<"users">> = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.image !== undefined) {
      updates.image = args.image;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch("users", userId, updates);
    }
    return null;
  },
});

export const setUserRole = internalMutation({
  args: {
    role: roleValidator,
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("users", args.userId, { role: args.role });
    return null;
  },
});

function withNormalizedRole(user: Doc<"users">): Doc<"users"> & {
  role: "admin" | "member";
} {
  return {
    ...user,
    role: normalizeRole(user),
  };
}
