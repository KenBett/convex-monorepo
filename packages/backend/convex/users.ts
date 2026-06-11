import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./lib/auth";

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
  }),
  v.null(),
);

export const viewer = query({
  args: {},
  returns: viewerValidator,
  handler: async (ctx): Promise<Doc<"users"> | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get("users", userId);
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
