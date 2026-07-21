import type { SearchResult as RagSearchResult } from "@convex-dev/rag";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  action,
  internalAction,
  internalQuery,
  query,
  type ActionCtx,
  type QueryCtx,
} from "../_generated/server";
import {
  assertValidCrop,
  isDebugListingDescription,
  requireBuyerProfile,
} from "../lib/listings";
import {
  listingCertificationValidator,
  listingPackagingValidator,
  listingTagValidator,
} from "../lib/listingAttributes";
import { getListingImageUrl } from "../lib/listingImages";
import {
  GLOBAL_NAMESPACE,
  SEARCH_LIMIT,
  VECTOR_SCORE_THRESHOLD,
  type RagEntryMetadata,
  rag,
} from "../lib/rag";
import { extractCropFromQuery } from "./buyerSearchIntentNormalize";

/** Max active listings loaded per crop for indexed browse (never unbounded). */
const INDEXED_CROP_CANDIDATE_CAP = 48;

export const listingSearchResultValidator = v.object({
  certifications: v.optional(v.array(listingCertificationValidator)),
  cooperativeName: v.string(),
  county: v.string(),
  crop: v.string(),
  description: v.string(),
  grade: v.optional(v.string()),
  harvestWindowLabel: v.optional(v.string()),
  imageUrl: v.union(v.string(), v.null()),
  listingId: v.id("listings"),
  minOrderKg: v.optional(v.number()),
  packaging: v.optional(listingPackagingValidator),
  packUnitKg: v.optional(v.number()),
  pricePerKg: v.number(),
  quantityKg: v.number(),
  score: v.number(),
  sizeOrCalibre: v.optional(v.string()),
  snippet: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("sold_out"),
    v.literal("expired"),
  ),
  tags: v.optional(v.array(listingTagValidator)),
  title: v.optional(v.string()),
  variety: v.optional(v.string()),
});

const searchCandidateValidator = v.object({
  listingId: v.id("listings"),
  score: v.number(),
  snippet: v.string(),
  title: v.optional(v.string()),
});

export const searchResponseValidator = v.object({
  results: v.array(listingSearchResultValidator),
});

export type ListingSearchResultRow = {
  certifications?: Doc<"listings">["certifications"];
  cooperativeName: string;
  county: string;
  crop: string;
  description: string;
  grade?: string;
  harvestWindowLabel?: string;
  imageUrl: string | null;
  listingId: Id<"listings">;
  minOrderKg?: number;
  packaging?: Doc<"listings">["packaging"];
  packUnitKg?: number;
  pricePerKg: number;
  quantityKg: number;
  score: number;
  sizeOrCalibre?: string;
  snippet: string;
  status: "active" | "expired" | "sold_out";
  tags?: Doc<"listings">["tags"];
  title?: string;
  variety?: string;
};

export const verifyBuyerAccess = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireBuyerProfile(ctx);
    return null;
  },
});

const chatListingAvailabilityValidator = v.object({
  listingId: v.id("listings"),
  status: v.union(
    v.literal("active"),
    v.literal("sold_out"),
    v.literal("expired"),
    v.literal("deleted"),
  ),
});

/** Reactive status for listings shown in buyer chat (sold out, deleted, etc.). */
export const getChatListingAvailability = query({
  args: {
    listingIds: v.array(v.id("listings")),
  },
  returns: v.array(chatListingAvailabilityValidator),
  handler: async (ctx, args) => {
    await requireBuyerProfile(ctx);

    const uniqueListingIds = Array.from(new Set(args.listingIds));
    const availability: Array<{
      listingId: Id<"listings">;
      status: "active" | "deleted" | "expired" | "sold_out";
    }> = [];

    for (const listingId of uniqueListingIds) {
      const listing = await ctx.db.get("listings", listingId);
      availability.push({
        listingId,
        status: listing ? listing.status : "deleted",
      });
    }

    return availability;
  },
});

async function toSearchResultRow(
  ctx: QueryCtx,
  listing: Doc<"listings">,
  candidate: {
    score: number;
    snippet: string;
    title?: string;
  },
): Promise<ListingSearchResultRow | null> {
  if (
    listing.status !== "active" ||
    listing.quantityKg <= 0 ||
    isDebugListingDescription(listing.description)
  ) {
    return null;
  }

  const farmer = await ctx.db.get("farmerProfiles", listing.farmerId);
  if (!farmer) {
    return null;
  }

  return {
    certifications: listing.certifications,
    cooperativeName: farmer.cooperativeName,
    county: listing.county,
    crop: listing.crop,
    description: listing.description,
    grade: listing.grade,
    harvestWindowLabel: listing.harvestWindowLabel,
    imageUrl: await getListingImageUrl(ctx, listing.imageStorageId),
    listingId: listing._id,
    minOrderKg: listing.minOrderKg,
    packaging: listing.packaging,
    packUnitKg: listing.packUnitKg,
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
    score: candidate.score,
    sizeOrCalibre: listing.sizeOrCalibre,
    snippet: candidate.snippet,
    status: listing.status,
    tags: listing.tags,
    title: candidate.title,
    variety: listing.variety,
  };
}

export const hydrateSearchCandidates = internalQuery({
  args: {
    candidates: v.array(searchCandidateValidator),
    requiredCrop: v.optional(v.string()),
  },
  returns: v.array(listingSearchResultValidator),
  handler: async (ctx, args) => {
    const rows = await Promise.all(
      args.candidates.map(async (candidate): Promise<ListingSearchResultRow | null> => {
        const listing = await ctx.db.get("listings", candidate.listingId);
        if (!listing) {
          return null;
        }

        if (args.requiredCrop && listing.crop !== args.requiredCrop) {
          return null;
        }

        return await toSearchResultRow(ctx, listing, {
          score: candidate.score,
          snippet: candidate.snippet,
          title: candidate.title,
        });
      }),
    );

    return rows.filter((result): result is ListingSearchResultRow => result !== null);
  },
});

/** Indexed browse: active listings for a known crop (no embeddings). */
export const listActiveListingsByCrop = internalQuery({
  args: {
    crop: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(listingSearchResultValidator),
  handler: async (ctx, args) => {
    assertValidCrop(args.crop);

    const takeLimit = Math.min(
      Math.max(args.limit ?? INDEXED_CROP_CANDIDATE_CAP, 1),
      INDEXED_CROP_CANDIDATE_CAP,
    );

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_crop_and_status", (q) =>
        q.eq("crop", args.crop).eq("status", "active"),
      )
      .take(takeLimit);

    const rows = await Promise.all(
      listings.map(async (listing) =>
        toSearchResultRow(ctx, listing, {
          score: 1,
          snippet: `${listing.crop} — ${listing.county}`,
          title: `${listing.crop} — ${listing.county}`,
        }),
      ),
    );

    return rows.filter((result): result is ListingSearchResultRow => result !== null);
  },
});

export async function runListingSemanticSearch(
  ctx: ActionCtx,
  args: {
    crop?: string;
    limit?: number;
    query: string;
  },
): Promise<{
  ragCandidateCount: number;
  results: ListingSearchResultRow[];
}> {
  const query = args.query.trim();
  if (query.length === 0) {
    throw new Error("Search query is required");
  }

  if (args.crop) {
    assertValidCrop(args.crop);
  }

  const resultLimit = args.limit ?? SEARCH_LIMIT;
  const response = await rag.search(ctx, {
    chunkContext: { after: 1, before: 1 },
    limit: Math.min(resultLimit * 4, 32),
    namespace: GLOBAL_NAMESPACE,
    query,
    vectorScoreThreshold: VECTOR_SCORE_THRESHOLD,
  });

  const candidates = collectListingCandidates(
    response.results,
    response.entries,
    resultLimit,
  );

  const results = await ctx.runQuery(internal.listings.search.hydrateSearchCandidates, {
    candidates,
    requiredCrop: args.crop,
  });

  return {
    ragCandidateCount: candidates.length,
    results,
  };
}

/**
 * Prefer indexed crop lookup when crop is known and the query is thin.
 * Use vector RAG for vague queries, and hybrid (index + vector) when crop is
 * known but the buyer still used rich descriptive language.
 */
export async function runListingBrowseSearch(
  ctx: ActionCtx,
  args: {
    crop?: string;
    limit?: number;
    query: string;
  },
): Promise<{
  ragCandidateCount: number;
  results: ListingSearchResultRow[];
  retrievalMode: "hybrid" | "indexed_browse" | "vector";
}> {
  const query = args.query.trim();
  const wantsVectorAugment = shouldAugmentCropBrowseWithVector(args.crop, query);

  if (args.crop && !wantsVectorAugment) {
    assertValidCrop(args.crop);

    const results = await ctx.runQuery(
      internal.listings.search.listActiveListingsByCrop,
      {
        crop: args.crop,
        limit: INDEXED_CROP_CANDIDATE_CAP,
      },
    );

    return {
      ragCandidateCount: results.length,
      results,
      retrievalMode: "indexed_browse",
    };
  }

  if (args.crop && wantsVectorAugment) {
    assertValidCrop(args.crop);

    const [indexed, semantic] = await Promise.all([
      ctx.runQuery(internal.listings.search.listActiveListingsByCrop, {
        crop: args.crop,
        limit: INDEXED_CROP_CANDIDATE_CAP,
      }),
      runListingSemanticSearch(ctx, {
        crop: args.crop,
        limit: args.limit,
        query: query.length > 0 ? query : args.crop,
      }),
    ]);

    const merged = mergeHybridResults(indexed, semantic.results);

    return {
      ragCandidateCount: Math.max(indexed.length, semantic.ragCandidateCount),
      results: merged,
      retrievalMode: "hybrid",
    };
  }

  const semantic = await runListingSemanticSearch(ctx, args);
  return {
    ...semantic,
    retrievalMode: "vector",
  };
}

/** Rich leftover language after crop name → also run vector search. */
function shouldAugmentCropBrowseWithVector(
  crop: string | undefined,
  query: string,
): boolean {
  if (!crop) {
    return true;
  }

  const leftover = query
    .toLowerCase()
    .replace(new RegExp(`\\b${crop}\\b`, "gi"), " ")
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);

  return leftover.length >= 2;
}

function mergeHybridResults(
  indexed: ListingSearchResultRow[],
  semantic: ListingSearchResultRow[],
): ListingSearchResultRow[] {
  const byId = new Map<string, ListingSearchResultRow>();

  for (const row of indexed) {
    byId.set(row.listingId, row);
  }

  for (const row of semantic) {
    const existing = byId.get(row.listingId);
    if (!existing || row.score > existing.score) {
      byId.set(row.listingId, row);
    }
  }

  return Array.from(byId.values());
}

export const runListingSemanticSearchInternal = internalAction({
  args: {
    crop: v.optional(v.string()),
    limit: v.optional(v.number()),
    query: v.string(),
  },
  returns: searchResponseValidator,
  handler: async (ctx, args) => {
    const { results } = await runListingBrowseSearch(ctx, args);
    return { results };
  },
});

export const semanticSearch = action({
  args: {
    crop: v.optional(v.string()),
    limit: v.optional(v.number()),
    query: v.string(),
  },
  returns: searchResponseValidator,
  handler: async (ctx, args): Promise<{ results: ListingSearchResultRow[] }> => {
    await ctx.runQuery(internal.listings.search.verifyBuyerAccess, {});

    const crop = args.crop ?? extractCropFromQuery(args.query);
    const { results } = await runListingBrowseSearch(ctx, {
      crop,
      limit: args.limit,
      query: args.query,
    });
    return { results };
  },
});

function collectListingCandidates(
  results: RagSearchResult[],
  entries: Array<{ entryId: string; metadata?: RagEntryMetadata; title?: string }>,
  limit: number,
): Array<{
  listingId: Id<"listings">;
  score: number;
  snippet: string;
  title?: string;
}> {
  const seenListingIds = new Set<string>();
  const candidates: Array<{
    listingId: Id<"listings">;
    score: number;
    snippet: string;
    title?: string;
  }> = [];

  for (const result of results) {
    if (candidates.length >= limit) {
      break;
    }

    const entry = entries.find((item) => item.entryId === result.entryId);
    const metadata = entry?.metadata;
    if (!isListingMetadata(metadata)) {
      continue;
    }

    if (metadata.status !== "active") {
      continue;
    }

    const listingIdKey = metadata.listingId;
    if (seenListingIds.has(listingIdKey)) {
      continue;
    }

    seenListingIds.add(listingIdKey);
    candidates.push({
      listingId: metadata.listingId,
      score: result.score,
      snippet: result.content.map((chunk) => chunk.text).join("\n"),
      title: entry?.title,
    });
  }

  return candidates;
}

function isListingMetadata(
  metadata: RagEntryMetadata | undefined,
): metadata is Extract<RagEntryMetadata, { sourceType: "listing" }> {
  return metadata?.sourceType === "listing";
}
