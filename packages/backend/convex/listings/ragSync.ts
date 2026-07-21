import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";
import { formatListingText } from "../lib/listings";
import { GLOBAL_NAMESPACE, rag, type RagEntryMetadata } from "../lib/rag";

const listingForSyncValidator = v.object({
  _id: v.id("listings"),
  certifications: v.optional(
    v.array(
      v.union(
        v.literal("kepsa"),
        v.literal("globalgap"),
        v.literal("fairtrade"),
        v.literal("organic_certified"),
      ),
    ),
  ),
  county: v.string(),
  crop: v.string(),
  description: v.string(),
  farmerId: v.id("farmerProfiles"),
  grade: v.optional(v.string()),
  harvestWindowLabel: v.optional(v.string()),
  minOrderKg: v.optional(v.number()),
  packaging: v.optional(
    v.union(
      v.literal("bulk"),
      v.literal("crates"),
      v.literal("gunny_bags"),
      v.literal("bags"),
    ),
  ),
  packUnitKg: v.optional(v.number()),
  pricePerKg: v.number(),
  quantityKg: v.number(),
  sizeOrCalibre: v.optional(v.string()),
  status: v.union(
    v.literal("active"),
    v.literal("sold_out"),
    v.literal("expired"),
  ),
  tags: v.optional(
    v.array(
      v.union(
        v.literal("organic"),
        v.literal("export_grade"),
        v.literal("washed"),
        v.literal("sorted"),
        v.literal("cold_chain"),
        v.literal("pesticide_free"),
        v.literal("irrigated"),
        v.literal("dried"),
        v.literal("fresh_picked"),
        v.literal("bulk_ready"),
        v.literal("sample_available"),
        v.literal("traceable"),
        v.literal("weekly_supply"),
      ),
    ),
  ),
  variety: v.optional(v.string()),
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
      certifications: listing.certifications,
      county: listing.county,
      crop: listing.crop,
      description: listing.description,
      farmerId: listing.farmerId,
      grade: listing.grade,
      harvestWindowLabel: listing.harvestWindowLabel,
      minOrderKg: listing.minOrderKg,
      packaging: listing.packaging,
      packUnitKg: listing.packUnitKg,
      pricePerKg: listing.pricePerKg,
      quantityKg: listing.quantityKg,
      sizeOrCalibre: listing.sizeOrCalibre,
      status: listing.status,
      tags: listing.tags,
      variety: listing.variety,
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

export const removeListingFromRag = internalAction({
  args: {
    listingId: v.id("listings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const namespace = await rag.getNamespace(ctx, {
      namespace: GLOBAL_NAMESPACE,
    });

    if (!namespace) {
      return null;
    }

    const listResult = await rag.list(ctx, {
      limit: 100,
      namespaceId: namespace.namespaceId,
    });

    for (const entry of listResult.page) {
      const metadata = entry.metadata as RagEntryMetadata | undefined;
      if (
        metadata?.sourceType === "listing" &&
        metadata.listingId === args.listingId
      ) {
        await rag.delete(ctx, { entryId: entry.entryId });
      }
    }

    return null;
  },
});
