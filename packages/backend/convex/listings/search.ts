import type { SearchResult as RagSearchResult } from "@convex-dev/rag";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalQuery } from "../_generated/server";
import { requireBuyerProfile } from "../lib/listings";
import {
  GLOBAL_NAMESPACE,
  SEARCH_LIMIT,
  VECTOR_SCORE_THRESHOLD,
  type RagEntryMetadata,
  rag,
} from "../lib/rag";

const listingSearchResultValidator = v.object({
  cooperativeName: v.string(),
  county: v.string(),
  crop: v.string(),
  description: v.string(),
  grade: v.optional(v.string()),
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

const searchResponseValidator = v.object({
  results: v.array(listingSearchResultValidator),
});

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
  },
  returns: v.array(listingSearchResultValidator),
  handler: async (ctx, args) => {
    const results: Array<{
      cooperativeName: string;
      county: string;
      crop: string;
      description: string;
      grade?: string;
      listingId: Id<"listings">;
      pricePerKg: number;
      quantityKg: number;
      score: number;
      snippet: string;
      status: "active" | "expired" | "sold_out";
      title?: string;
    }> = [];

    for (const candidate of args.candidates) {
      const listing = await ctx.db.get("listings", candidate.listingId);
      if (!listing || listing.status !== "active" || listing.quantityKg <= 0) {
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

export const semanticSearch = action({
  args: {
    limit: v.optional(v.number()),
    query: v.string(),
  },
  returns: searchResponseValidator,
  handler: async (ctx, args): Promise<{
    results: Array<{
      cooperativeName: string;
      county: string;
      crop: string;
      description: string;
      grade?: string;
      listingId: Id<"listings">;
      pricePerKg: number;
      quantityKg: number;
      score: number;
      snippet: string;
      status: "active" | "expired" | "sold_out";
      title?: string;
    }>;
  }> => {
    await ctx.runQuery(internal.listings.search.verifyBuyerAccess, {});

    const query = args.query.trim();
    if (query.length === 0) {
      throw new Error("Search query is required");
    }

    const resultLimit = args.limit ?? SEARCH_LIMIT;
    const response = await rag.search(ctx, {
      chunkContext: { before: 1, after: 1 },
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
