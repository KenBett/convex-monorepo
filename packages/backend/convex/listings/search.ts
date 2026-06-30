import type { SearchResult as RagSearchResult } from "@convex-dev/rag";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  action,
  internalAction,
  internalQuery,
  type ActionCtx,
} from "../_generated/server";
import {
  assertValidCrop,
  isDebugListingDescription,
  requireBuyerProfile,
} from "../lib/listings";
import { getListingImageUrl } from "../lib/listingImages";
import {
  GLOBAL_NAMESPACE,
  SEARCH_LIMIT,
  VECTOR_SCORE_THRESHOLD,
  type RagEntryMetadata,
  rag,
} from "../lib/rag";

export const listingSearchResultValidator = v.object({
  cooperativeName: v.string(),
  county: v.string(),
  crop: v.string(),
  description: v.string(),
  grade: v.optional(v.string()),
  imageUrl: v.union(v.string(), v.null()),
  listingId: v.id("listings"),
  pricePerKg: v.number(),
  quantityKg: v.number(),
  score: v.number(),
  snippet: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("sold_out"),
    v.literal("expired"),
  ),
  title: v.optional(v.string()),
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
  cooperativeName: string;
  county: string;
  crop: string;
  description: string;
  grade?: string;
  imageUrl: string | null;
  listingId: Id<"listings">;
  pricePerKg: number;
  quantityKg: number;
  score: number;
  snippet: string;
  status: "active" | "expired" | "sold_out";
  title?: string;
};

export const verifyBuyerAccess = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireBuyerProfile(ctx);
    return null;
  },
});

export const hydrateSearchCandidates = internalQuery({
  args: {
    candidates: v.array(searchCandidateValidator),
    requiredCrop: v.optional(v.string()),
  },
  returns: v.array(listingSearchResultValidator),
  handler: async (ctx, args) => {
    const results: ListingSearchResultRow[] = [];

    for (const candidate of args.candidates) {
      const listing = await ctx.db.get("listings", candidate.listingId);
      if (
        !listing ||
        listing.status !== "active" ||
        listing.quantityKg <= 0 ||
        isDebugListingDescription(listing.description)
      ) {
        continue;
      }

      if (args.requiredCrop && listing.crop !== args.requiredCrop) {
        continue;
      }

      const farmer = await ctx.db.get("farmerProfiles", listing.farmerId);
      if (!farmer) {
        continue;
      }

      results.push({
        cooperativeName: farmer.cooperativeName,
        county: listing.county,
        crop: listing.crop,
        description: listing.description,
        grade: listing.grade,
        imageUrl: await getListingImageUrl(ctx, listing.imageStorageId),
        listingId: listing._id,
        pricePerKg: listing.pricePerKg,
        quantityKg: listing.quantityKg,
        score: candidate.score,
        snippet: candidate.snippet,
        status: listing.status,
        title: candidate.title,
      });
    }

    return results;
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

export const runListingSemanticSearchInternal = internalAction({
  args: {
    crop: v.optional(v.string()),
    limit: v.optional(v.number()),
    query: v.string(),
  },
  returns: searchResponseValidator,
  handler: async (ctx, args) => {
    const { results } = await runListingSemanticSearch(ctx, args);
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

    const { results } = await runListingSemanticSearch(ctx, args);
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
