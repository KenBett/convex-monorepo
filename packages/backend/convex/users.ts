import { getAuthUserId } from "@convex-dev/auth/server";
import { COUNTIES } from "@repo/types";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./lib/auth";
import { getMarketplaceRole } from "./lib/roles";

const marketplaceRoleValidator = v.union(
  v.literal("farmer"),
  v.literal("buyer"),
);

const businessTypeValidator = v.union(
  v.literal("hotel"),
  v.literal("supermarket"),
  v.literal("exporter"),
  v.literal("individual"),
);

const farmerProfileInputValidator = v.object({
  cooperativeName: v.string(),
  county: v.string(),
  mpesaNumber: v.string(),
  phoneNumber: v.string(),
});

const buyerProfileInputValidator = v.object({
  businessName: v.string(),
  businessType: businessTypeValidator,
  county: v.string(),
  phoneNumber: v.string(),
});

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

const farmerProfileSummaryValidator = v.object({
  cooperativeName: v.string(),
  county: v.string(),
  mpesaNumber: v.string(),
  phoneNumber: v.string(),
});

const buyerProfileSummaryValidator = v.object({
  businessName: v.string(),
  businessType: businessTypeValidator,
  county: v.string(),
  phoneNumber: v.string(),
});

export const farmerProfile = query({
  args: {},
  returns: v.union(farmerProfileSummaryValidator, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get("users", userId);
    if (!user || getMarketplaceRole(user) !== "farmer") {
      return null;
    }

    const profile = await ctx.db
      .query("farmerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      return null;
    }

    return {
      cooperativeName: profile.cooperativeName,
      county: profile.county,
      mpesaNumber: profile.mpesaNumber,
      phoneNumber: profile.phoneNumber,
    };
  },
});

export const buyerProfile = query({
  args: {},
  returns: v.union(buyerProfileSummaryValidator, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get("users", userId);
    if (!user || getMarketplaceRole(user) !== "buyer") {
      return null;
    }

    const profile = await ctx.db
      .query("buyerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      return null;
    }

    return {
      businessName: profile.businessName,
      businessType: profile.businessType,
      county: profile.county,
      phoneNumber: profile.phoneNumber,
    };
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
      updates.name = args.name.trim() || undefined;
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

export const updateFarmerProfile = mutation({
  args: farmerProfileInputValidator,
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const user = await ctx.db.get("users", userId);
    if (!user || getMarketplaceRole(user) !== "farmer") {
      throw new Error("Farmer profile not found");
    }

    assertValidCounty(args.county);

    const profile = await ctx.db
      .query("farmerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) {
      throw new Error("Farmer profile not found");
    }

    await ctx.db.patch("farmerProfiles", profile._id, {
      cooperativeName: args.cooperativeName.trim(),
      county: args.county,
      mpesaNumber: args.mpesaNumber.trim(),
      phoneNumber: args.phoneNumber.trim(),
    });
    return null;
  },
});

export const updateBuyerProfile = mutation({
  args: buyerProfileInputValidator,
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const user = await ctx.db.get("users", userId);
    if (!user || getMarketplaceRole(user) !== "buyer") {
      throw new Error("Buyer profile not found");
    }

    assertValidCounty(args.county);

    const profile = await ctx.db
      .query("buyerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) {
      throw new Error("Buyer profile not found");
    }

    await ctx.db.patch("buyerProfiles", profile._id, {
      businessName: args.businessName.trim(),
      businessType: args.businessType,
      county: args.county,
      phoneNumber: args.phoneNumber.trim(),
    });
    return null;
  },
});

export const setUserRole = mutation({
  args: {
    role: marketplaceRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const user = await ctx.db.get("users", userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.role !== undefined) {
      throw new Error("Role already set");
    }
    if (user.onboardingComplete) {
      throw new Error("Onboarding already complete");
    }
    await ctx.db.patch("users", userId, { role: args.role });
    return null;
  },
});

export const completeOnboarding = mutation({
  args: {
    buyerProfile: v.optional(buyerProfileInputValidator),
    farmerProfile: v.optional(farmerProfileInputValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const user = await ctx.db.get("users", userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.role) {
      throw new Error("Select a role first");
    }
    if (user.onboardingComplete) {
      throw new Error("Onboarding already complete");
    }

    if (user.role === "farmer") {
      if (!args.farmerProfile) {
        throw new Error("Farmer profile is required");
      }
      assertValidCounty(args.farmerProfile.county);
      const existing = await ctx.db
        .query("farmerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      if (existing) {
        throw new Error("Farmer profile already exists");
      }
      await ctx.db.insert("farmerProfiles", {
        userId,
        cooperativeName: args.farmerProfile.cooperativeName.trim(),
        county: args.farmerProfile.county,
        mpesaNumber: args.farmerProfile.mpesaNumber.trim(),
        phoneNumber: args.farmerProfile.phoneNumber.trim(),
      });
    } else {
      if (!args.buyerProfile) {
        throw new Error("Buyer profile is required");
      }
      assertValidCounty(args.buyerProfile.county);
      const existing = await ctx.db
        .query("buyerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      if (existing) {
        throw new Error("Buyer profile already exists");
      }
      await ctx.db.insert("buyerProfiles", {
        userId,
        businessName: args.buyerProfile.businessName.trim(),
        businessType: args.buyerProfile.businessType,
        county: args.buyerProfile.county,
        phoneNumber: args.buyerProfile.phoneNumber.trim(),
      });
    }

    await ctx.db.patch("users", userId, { onboardingComplete: true });
    return null;
  },
});

function assertValidCounty(county: string): void {
  if (!(COUNTIES as readonly string[]).includes(county)) {
    throw new Error("Invalid county");
  }
}

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
