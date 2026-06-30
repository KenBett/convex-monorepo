import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
  type ActionCtx,
} from "../_generated/server";
import {
  requireFarmerProfile,
  STAGE_A_RAG_MARKER,
  STAGE_B_CROP_MARKER,
} from "../lib/listings";
import { PLACEHOLDER_PNG_BYTES } from "../lib/listingImages";
import {
  GLOBAL_NAMESPACE,
  VECTOR_SCORE_THRESHOLD,
  rag,
  type RagEntryMetadata,
} from "../lib/rag";
import { runListingSemanticSearch } from "./search";

const listingIndexRowValidator = v.object({
  _id: v.id("listings"),
  county: v.string(),
  crop: v.string(),
  hasImage: v.boolean(),
  status: v.union(
    v.literal("active"),
    v.literal("sold_out"),
    v.literal("expired"),
  ),
});

const ragEntryValidator = v.object({
  entryId: v.string(),
  listingId: v.optional(v.id("listings")),
  status: v.string(),
  title: v.optional(v.string()),
});

export const debugListingIndex = query({
  args: {},
  returns: v.object({
    listings: v.array(listingIndexRowValidator),
    ragEntries: v.array(ragEntryValidator),
    ragNamespace: v.union(
      v.object({
        namespace: v.string(),
        namespaceId: v.string(),
        status: v.string(),
      }),
      v.null(),
    ),
    ragReadyEntryCount: v.number(),
  }),
  handler: async (ctx) => {
    const profile = await requireFarmerProfile(ctx);

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", profile._id))
      .order("desc")
      .collect();

    const namespace = await rag.getNamespace(ctx, {
      namespace: GLOBAL_NAMESPACE,
    });

    if (!namespace) {
      return {
        listings: listings.map((listing) => ({
          _id: listing._id,
          county: listing.county,
          crop: listing.crop,
          hasImage: Boolean(listing.imageStorageId),
          status: listing.status,
        })),
        ragEntries: [],
        ragNamespace: null,
        ragReadyEntryCount: 0,
      };
    }

    const listResult = await rag.list(ctx, {
      limit: 100,
      namespaceId: namespace.namespaceId,
      status: "ready",
    });

    const ragEntries = listResult.page.flatMap((entry) => {
      const metadata = entry.metadata as RagEntryMetadata | undefined;
      if (metadata?.sourceType !== "listing") {
        return [];
      }

      return [
        {
          entryId: entry.entryId,
          listingId: metadata.listingId,
          status: entry.status,
          title: entry.title,
        },
      ];
    });

    return {
      listings: listings.map((listing) => ({
        _id: listing._id,
        county: listing.county,
        crop: listing.crop,
        hasImage: Boolean(listing.imageStorageId),
        status: listing.status,
      })),
      ragEntries,
      ragNamespace: {
        namespace: GLOBAL_NAMESPACE,
        namespaceId: namespace.namespaceId,
        status: namespace.status,
      },
      ragReadyEntryCount: ragEntries.length,
    };
  },
});

export const insertStageAListing = internalMutation({
  args: { imageStorageId: v.id("_storage") },
  returns: v.id("listings"),
  handler: async (ctx, args) => {
    const farmer = await ctx.db.query("farmerProfiles").first();
    if (!farmer) {
      throw new Error("No farmer profile found. Complete farmer onboarding first.");
    }

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
      .collect();

    for (const listing of listings) {
      if (listing.description.includes(STAGE_A_RAG_MARKER)) {
        await ctx.db.delete("listings", listing._id);
      }
    }

    return await ctx.db.insert("listings", {
      county: "Nairobi",
      crop: "potatoes",
      description: `${STAGE_A_RAG_MARKER}: distinctive potatoes listing for semantic search e2e test.`,
      farmerId: farmer._id,
      imageStorageId: args.imageStorageId,
      pricePerKg: 50,
      quantityKg: 50,
      status: "active",
    });
  },
});

export const seedStageAListing = internalAction({
  args: {},
  returns: v.id("listings"),
  handler: async (ctx): Promise<Id<"listings">> => {
    const imageStorageId = await ctx.storage.store(
      new Blob([PLACEHOLDER_PNG_BYTES], { type: "image/png" }),
    );

    return await ctx.runMutation(internal.listings.ragDebug.insertStageAListing, {
      imageStorageId,
    });
  },
});

export const markStageAListingSoldOut = internalMutation({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("listings", args.listingId, { status: "sold_out" });
    return null;
  },
});

export const getListingRagState = internalQuery({
  args: { listingId: v.id("listings") },
  returns: v.union(
    v.object({
      hasImage: v.boolean(),
      status: v.union(
        v.literal("active"),
        v.literal("sold_out"),
        v.literal("expired"),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing) {
      return null;
    }

    return {
      hasImage: Boolean(listing.imageStorageId),
      status: listing.status,
    };
  },
});

const stageAResultValidator = v.object({
  activeResultCount: v.number(),
  foundWhenActive: v.boolean(),
  foundWhenSoldOut: v.boolean(),
  indexed: v.boolean(),
  listingId: v.id("listings"),
  searchQuery: v.string(),
  soldOutResultCount: v.number(),
});

export const runStageARagVerification = internalAction({
  args: {},
  returns: stageAResultValidator,
  handler: async (ctx): Promise<{
    activeResultCount: number;
    foundWhenActive: boolean;
    foundWhenSoldOut: boolean;
    indexed: boolean;
    listingId: Id<"listings">;
    searchQuery: string;
    soldOutResultCount: number;
  }> => {
    const listingId: Id<"listings"> = await ctx.runAction(
      internal.listings.ragDebug.seedStageAListing,
      {},
    );

    await ctx.runAction(internal.listings.ragSync.syncListingToRag, {
      listingId,
    });

    const afterSync: {
      hasImage: boolean;
      status: "active" | "expired" | "sold_out";
    } | null = await ctx.runQuery(internal.listings.ragDebug.getListingRagState, {
      listingId,
    });

    const searchQuery = "STAGE_A_RAG_VERIFICATION potatoes Nairobi";
    const activeResults = await searchActiveListings(ctx, searchQuery, listingId);

    await ctx.runMutation(internal.listings.ragDebug.markStageAListingSoldOut, {
      listingId,
    });
    await ctx.runAction(internal.listings.ragSync.syncListingToRag, {
      listingId,
    });

    const soldOutResults = await searchActiveListings(ctx, searchQuery, listingId);

    return {
      activeResultCount: activeResults.length,
      foundWhenActive: activeResults.includes(listingId),
      foundWhenSoldOut: soldOutResults.includes(listingId),
      indexed: Boolean(afterSync?.hasImage),
      listingId,
      searchQuery,
      soldOutResultCount: soldOutResults.length,
    };
  },
});

async function searchActiveListings(
  ctx: ActionCtx,
  queryText: string,
  targetListingId: Id<"listings">,
): Promise<Array<Id<"listings">>> {
  const response = await rag.search(ctx, {
    chunkContext: { after: 1, before: 1 },
    limit: 32,
    namespace: GLOBAL_NAMESPACE,
    query: queryText,
    vectorScoreThreshold: VECTOR_SCORE_THRESHOLD,
  });

  const activeListingIds: Array<Id<"listings">> = [];

  for (const result of response.results) {
    const entry = response.entries.find((item) => item.entryId === result.entryId);
    const metadata = entry?.metadata as RagEntryMetadata | undefined;
    if (metadata?.sourceType !== "listing") {
      continue;
    }

    const hydrated = await ctx.runQuery(internal.listings.search.hydrateSearchCandidates, {
      candidates: [
        {
          listingId: metadata.listingId,
          score: result.score,
          snippet: result.content.map((chunk) => chunk.text).join("\n"),
          title: entry?.title,
        },
      ],
    });

    for (const row of hydrated) {
      activeListingIds.push(row.listingId);
    }
  }

  return activeListingIds.filter((id) => id === targetListingId);
}

const stageBCropResultValidator = v.object({
  cropFilter: v.string(),
  maizeFound: v.boolean(),
  maizeListingId: v.id("listings"),
  potatoLeakCount: v.number(),
  potatoListingId: v.id("listings"),
  searchQuery: v.string(),
});

export const insertStageBCropListings = internalMutation({
  args: { imageStorageId: v.id("_storage") },
  returns: v.object({
    maizeListingId: v.id("listings"),
    potatoListingId: v.id("listings"),
  }),
  handler: async (ctx, args) => {
    const farmer = await ctx.db.query("farmerProfiles").first();
    if (!farmer) {
      throw new Error("No farmer profile found. Complete farmer onboarding first.");
    }

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
      .collect();

    for (const listing of listings) {
      if (listing.description.includes(STAGE_B_CROP_MARKER)) {
        await ctx.db.delete("listings", listing._id);
      }
    }

    const sharedDescription = `${STAGE_B_CROP_MARKER}: staple grain and tuber produce available in Nairobi with similar quality and pricing for crop filter verification.`;

    const maizeListingId = await ctx.db.insert("listings", {
      county: "Nairobi",
      crop: "maize",
      description: sharedDescription,
      farmerId: farmer._id,
      imageStorageId: args.imageStorageId,
      pricePerKg: 45,
      quantityKg: 200,
      status: "active",
    });

    const potatoListingId = await ctx.db.insert("listings", {
      county: "Nairobi",
      crop: "potatoes",
      description: sharedDescription,
      farmerId: farmer._id,
      imageStorageId: args.imageStorageId,
      pricePerKg: 45,
      quantityKg: 200,
      status: "active",
    });

    return { maizeListingId, potatoListingId };
  },
});

export const seedStageBCropListings = internalAction({
  args: {},
  returns: v.object({
    maizeListingId: v.id("listings"),
    potatoListingId: v.id("listings"),
  }),
  handler: async (ctx): Promise<{
    maizeListingId: Id<"listings">;
    potatoListingId: Id<"listings">;
  }> => {
    const imageStorageId = await ctx.storage.store(
      new Blob([PLACEHOLDER_PNG_BYTES], { type: "image/png" }),
    );

    return await ctx.runMutation(internal.listings.ragDebug.insertStageBCropListings, {
      imageStorageId,
    });
  },
});

export const runStageBCropFilterVerification = internalAction({
  args: {},
  returns: stageBCropResultValidator,
  handler: async (ctx): Promise<{
    cropFilter: string;
    maizeFound: boolean;
    maizeListingId: Id<"listings">;
    potatoLeakCount: number;
    potatoListingId: Id<"listings">;
    searchQuery: string;
  }> => {
    const { maizeListingId, potatoListingId } = await ctx.runAction(
      internal.listings.ragDebug.seedStageBCropListings,
      {},
    );

    await ctx.runAction(internal.listings.ragSync.syncListingToRag, {
      listingId: maizeListingId,
    });
    await ctx.runAction(internal.listings.ragSync.syncListingToRag, {
      listingId: potatoListingId,
    });

    const searchQuery = `${STAGE_B_CROP_MARKER} staple produce Nairobi`;
    const cropFilter = "maize";

    const { results } = await runListingSemanticSearch(ctx, {
      crop: cropFilter,
      limit: 8,
      query: searchQuery,
    });

    const potatoLeaks = results.filter((result) => result.crop === "potatoes");
    const maizeFound = results.some((result) => result.listingId === maizeListingId);

    return {
      cropFilter,
      maizeFound,
      maizeListingId,
      potatoLeakCount: potatoLeaks.length,
      potatoListingId,
      searchQuery,
    };
  },
});
