import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./lib/auth";
import { getMarketplaceRole } from "./lib/roles";

const marketplaceRoleValidator = v.union(
  v.literal("farmer"),
  v.literal("buyer"),
);

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
    onboardingComplete: v.boolean(),
    role: v.optional(marketplaceRoleValidator),
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
    return withViewerFields(user);
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
    role: marketplaceRoleValidator,
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("users", args.userId, { role: args.role });
    return null;
  },
});

function withViewerFields(user: Doc<"users">): {
  _id: Doc<"users">["_id"];
  _creationTime: Doc<"users">["_creationTime"];
  name?: string;
  image?: string;
  email?: string;
  emailVerificationTime?: number;
  phone?: string;
  phoneVerificationTime?: number;
  isAnonymous?: boolean;
  onboardingComplete: boolean;
  role?: "farmer" | "buyer";
} {
  return {
    _id: user._id,
    _creationTime: user._creationTime,
    name: user.name,
    image: user.image,
    email: user.email,
    emailVerificationTime: user.emailVerificationTime,
    phone: user.phone,
    phoneVerificationTime: user.phoneVerificationTime,
    isAnonymous: user.isAnonymous,
    onboardingComplete: user.onboardingComplete ?? false,
    role: getMarketplaceRole(user),
  };
}
