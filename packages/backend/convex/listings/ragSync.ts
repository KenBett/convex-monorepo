import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";
import { formatListingText } from "../lib/listings";
import { GLOBAL_NAMESPACE, rag } from "../lib/rag";

const listingForSyncValidator = v.object({
  _id: v.id("listings"),
  county: v.string(),
  crop: v.string(),
  description: v.string(),
  farmerId: v.id("farmerProfiles"),
  grade: v.optional(v.string()),
  pricePerKg: v.number(),
  quantityKg: v.number(),
  status: v.union(
    v.literal("active"),
    v.literal("sold_out"),
    v.literal("expired"),
  ),
});

export const getListingForSync = internalQuery({
  args: {
    listingId: v.id("listings"),
  },
  returns: v.union(listingForSyncValidator, v.null()),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing) {
      return null;
    }

    return {
      _id: listing._id,
      county: listing.county,
      crop: listing.crop,
      description: listing.description,
      farmerId: listing.farmerId,
      grade: listing.grade,
      pricePerKg: listing.pricePerKg,
      quantityKg: listing.quantityKg,
      status: listing.status,
    };
  },
});

export const completeListing = rag.defineOnComplete<DataModel>(async (ctx, args) => {
  const metadata = args.entry.metadata;
  if (metadata === undefined || metadata.sourceType !== "listing") {
    return;
  }

  if (args.error !== undefined) {
    console.error("Listing RAG sync failed", {
      error: args.error,
      listingId: metadata.listingId,
    });
  }
});

export const syncListingToRag = internalAction({
  args: {
    listingId: v.id("listings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const listing = await ctx.runQuery(internal.listings.ragSync.getListingForSync, {
      listingId: args.listingId,
    });

    if (!listing) {
      throw new Error("Listing not found");
    }

    const text = formatListingText(listing);
    const title = `${listing.crop} — ${listing.county}`;

    const result = await rag.add(ctx, {
      key: args.listingId,
      metadata: {
        farmerId: listing.farmerId,
        listingId: listing._id,
        sourceType: "listing",
        status: listing.status,
      },
      namespace: GLOBAL_NAMESPACE,
      onComplete: internal.listings.ragSync.completeListing,
      text,
      title,
    });

    if (result.status !== "ready") {
      throw new Error(`Listing indexing did not complete (status: ${result.status})`);
    }

    return null;
  },
});
