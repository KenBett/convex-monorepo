import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
  assertPositiveNumber,
  assertValidCounty,
  assertValidCrop,
  requireFarmerProfile,
} from "./lib/listings";

const listingStatusValidator = v.union(
  v.literal("active"),
  v.literal("sold_out"),
  v.literal("expired"),
);

const listingSummaryValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("listings"),
  availableFrom: v.optional(v.number()),
  county: v.string(),
  crop: v.string(),
  description: v.string(),
  farmerId: v.id("farmerProfiles"),
  grade: v.optional(v.string()),
  pricePerKg: v.number(),
  quantityKg: v.number(),
  ragDocumentId: v.optional(v.string()),
  status: listingStatusValidator,
});

export const listingsByFarmer = query({
  args: {},
  returns: v.array(listingSummaryValidator),
  handler: async (ctx) => {
    const profile = await requireFarmerProfile(ctx);

    return await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", profile._id))
      .order("desc")
      .collect();
  },
});

export const getListingById = query({
  args: { listingId: v.id("listings") },
  returns: v.union(listingSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    const profile = await requireFarmerProfile(ctx);
    const listing = await ctx.db.get("listings", args.listingId);

    if (!listing || listing.farmerId !== profile._id) {
      return null;
    }

    return listing;
  },
});

export const createListing = mutation({
  args: {
    county: v.string(),
    crop: v.string(),
    description: v.string(),
    grade: v.optional(v.string()),
    pricePerKg: v.number(),
    quantityKg: v.number(),
  },
  returns: v.id("listings"),
  handler: async (ctx, args) => {
    const profile = await requireFarmerProfile(ctx);

    assertValidCrop(args.crop);
    assertValidCounty(args.county);
    assertPositiveNumber(args.quantityKg, "Quantity");
    assertPositiveNumber(args.pricePerKg, "Price");

    const description = args.description.trim();
    if (description.length === 0) {
      throw new Error("Description is required");
    }

    const listingId = await ctx.db.insert("listings", {
      county: args.county,
      crop: args.crop,
      description,
      farmerId: profile._id,
      grade: args.grade?.trim() || undefined,
      pricePerKg: args.pricePerKg,
      quantityKg: args.quantityKg,
      status: "active",
    });

    await ctx.scheduler.runAfter(0, internal.listings.ragSync.syncListingToRag, {
      listingId,
    });

    return listingId;
  },
});

export const updateListing = mutation({
  args: {
    county: v.optional(v.string()),
    crop: v.optional(v.string()),
    description: v.optional(v.string()),
    grade: v.optional(v.string()),
    listingId: v.id("listings"),
    pricePerKg: v.optional(v.number()),
    quantityKg: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireFarmerProfile(ctx);
    const listing = await ctx.db.get("listings", args.listingId);

    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.farmerId !== profile._id) {
      throw new Error("Unauthorized");
    }

    const updates: {
      county?: string;
      crop?: string;
      description?: string;
      grade?: string;
      pricePerKg?: number;
      quantityKg?: number;
    } = {};

    if (args.crop !== undefined) {
      assertValidCrop(args.crop);
      updates.crop = args.crop;
    }

    if (args.county !== undefined) {
      assertValidCounty(args.county);
      updates.county = args.county;
    }

    if (args.quantityKg !== undefined) {
      assertPositiveNumber(args.quantityKg, "Quantity");
      updates.quantityKg = args.quantityKg;
    }

    if (args.pricePerKg !== undefined) {
      assertPositiveNumber(args.pricePerKg, "Price");
      updates.pricePerKg = args.pricePerKg;
    }

    if (args.description !== undefined) {
      const description = args.description.trim();
      if (description.length === 0) {
        throw new Error("Description is required");
      }
      updates.description = description;
    }

    if (args.grade !== undefined) {
      updates.grade = args.grade.trim() || undefined;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch("listings", args.listingId, updates);
    await ctx.scheduler.runAfter(0, internal.listings.ragSync.syncListingToRag, {
      listingId: args.listingId,
    });

    return null;
  },
});

export const markSoldOut = mutation({
  args: {
    listingId: v.id("listings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireFarmerProfile(ctx);
    const listing = await ctx.db.get("listings", args.listingId);

    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.farmerId !== profile._id) {
      throw new Error("Unauthorized");
    }

    if (listing.status === "sold_out") {
      return null;
    }

    await ctx.db.patch("listings", args.listingId, { status: "sold_out" });
    await ctx.scheduler.runAfter(0, internal.listings.ragSync.syncListingToRag, {
      listingId: args.listingId,
    });

    return null;
  },
});
