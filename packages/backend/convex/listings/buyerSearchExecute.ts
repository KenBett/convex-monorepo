import { v } from "convex/values";

import type { BuyerRetrievalMode } from "@repo/types";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  listingCertificationValidator,
  listingPackagingValidator,
  listingTagValidator,
} from "../lib/listingAttributes";
import type { BuyerSearchIntent } from "./buyerChatParse";
import {
  buildCompletedTrail,
  buildFilterLabels,
} from "./buyerChatTrail";
import {
  applyIntentFilters,
  intentHasQualityOrStandardsFilters,
  limitResults,
  rankByRelevance,
  sortResultsByPricePreference,
} from "./buyerSearchRank";
import {
  type ListingSearchResultRow,
  runListingBrowseSearch,
} from "./search";

type BuyerSearchMeta = {
  excludedSoldOutCount: number;
  filterLabels: string[];
  ragCandidateCount: number;
  resultCount: number;
  retrievalMode: BuyerRetrievalMode;
  trail: ReturnType<typeof buildCompletedTrail>;
};

type BuyerChatPreviousSourcingContext = {
  crops: string[];
  intent: BuyerSearchIntent;
  listingCount: number;
  listings: Array<{
    certifications?: Doc<"listings">["certifications"];
    cooperativeName: string;
    county: string;
    crop: string;
    description?: string;
    grade?: string;
    harvestWindowLabel?: string;
    listingId: Id<"listings">;
    minOrderKg?: number;
    packaging?: Doc<"listings">["packaging"];
    packUnitKg?: number;
    pricePerKg: number;
    quantityKg: number;
    sizeOrCalibre?: string;
    status: "active" | "expired" | "sold_out";
    tags?: Doc<"listings">["tags"];
    variety?: string;
  }>;
};

function excludePreviouslyShownListings(
  results: ListingSearchResultRow[],
  previousSourcing?: BuyerChatPreviousSourcingContext,
): ListingSearchResultRow[] {
  if (!previousSourcing || previousSourcing.listings.length === 0) {
    return results;
  }

  const shownIds = new Set(
    previousSourcing.listings.map((listing) => listing.listingId),
  );
  return results.filter((result) => !shownIds.has(result.listingId));
}

async function hydratePreviousListings(
  ctx: ActionCtx,
  intent: BuyerSearchIntent,
  previousSourcing: BuyerChatPreviousSourcingContext,
): Promise<ListingSearchResultRow[]> {
  const candidates = previousSourcing.listings.map((listing) => ({
    listingId: listing.listingId,
    score: 0,
    snippet: `${listing.crop} listing`,
  }));

  return await ctx.runQuery(internal.listings.search.hydrateSearchCandidates, {
    candidates,
    requiredCrop: intent.crop ?? previousSourcing.intent.crop,
  });
}

export async function executeBuyerSearchFromIntent(
  ctx: ActionCtx,
  intent: BuyerSearchIntent,
  previousSourcing?: BuyerChatPreviousSourcingContext,
  options?: {
    /** Skip vector/RAG — indexed crop browse + hard filters only. */
    indexedOnly?: boolean;
  },
): Promise<{
  intent: BuyerSearchIntent;
  meta: BuyerSearchMeta;
  results: ListingSearchResultRow[];
}> {
  const filterLabels = buildFilterLabels(intent);

  if (intent.refinePreviousResults && previousSourcing) {
    const hydratedResults = await hydratePreviousListings(
      ctx,
      intent,
      previousSourcing,
    );
    const filteredResults = applyIntentFilters(hydratedResults, intent);
    const rankedResults = rankByRelevance(filteredResults, intent);
    const sortedResults = sortResultsByPricePreference(
      rankedResults,
      intent.pricePreference,
    );
    const results = limitResults(sortedResults, intent.resultLimit);
    const retrievalMode = "refine" as const;
    const meta: BuyerSearchMeta = {
      excludedSoldOutCount: Math.max(
        0,
        previousSourcing.listings.length - hydratedResults.length,
      ),
      filterLabels,
      ragCandidateCount: previousSourcing.listings.length,
      resultCount: results.length,
      retrievalMode,
      trail: buildCompletedTrail({
        filterLabels,
        ragCandidateCount: previousSourcing.listings.length,
        resultCount: results.length,
        retrievalMode,
      }),
    };

    return {
      intent,
      meta,
      results,
    };
  }

  const query = intent.searchText.trim();
  // Quality/Standards hard filters need the full crop index — vector top-K alone
  // can miss tagged/certified listings that live browse would keep.
  const preferIndexedForQuality =
    intentHasQualityOrStandardsFilters(intent) && Boolean(intent.crop);
  const {
    ragCandidateCount,
    results: hydratedResults,
    retrievalMode,
  } = await runListingBrowseSearch(ctx, {
    crop: intent.crop,
    indexedOnly: options?.indexedOnly || preferIndexedForQuality,
    limit: intent.excludePreviousListings ? 12 : 8,
    query: query.length > 0 ? query : "produce",
  });

  const filteredResults = applyIntentFilters(hydratedResults, intent);
  const rankedResults = rankByRelevance(filteredResults, intent);
  const sortedResults = sortResultsByPricePreference(
    rankedResults,
    intent.pricePreference,
  );
  const withoutShown = intent.excludePreviousListings
    ? excludePreviouslyShownListings(sortedResults, previousSourcing)
    : sortedResults;
  const results = limitResults(withoutShown, intent.resultLimit);
  const meta: BuyerSearchMeta = {
    excludedSoldOutCount: Math.max(0, ragCandidateCount - hydratedResults.length),
    filterLabels,
    ragCandidateCount,
    resultCount: results.length,
    retrievalMode,
    trail: buildCompletedTrail({
      filterLabels,
      ragCandidateCount,
      resultCount: results.length,
      retrievalMode,
    }),
  };

  return {
    intent,
    meta,
    results,
  };
}

export type BuyerSearchGroupResult = {
  intent: BuyerSearchIntent;
  meta: BuyerSearchMeta;
  results: ListingSearchResultRow[];
};

/**
 * Run one strict search per clause (e.g. "grade 2 tomatoes" and "maize from Bungoma" from a
 * single compound message) and return each clause's own group of results, so a buyer request
 * for multiple distinct crop/county/grade combinations doesn't collapse into one search.
 */
export async function executeBuyerSearchClauses(
  ctx: ActionCtx,
  clauses: BuyerSearchIntent[],
  previousSourcing?: BuyerChatPreviousSourcingContext,
): Promise<{ groups: BuyerSearchGroupResult[] }> {
  const groups = await Promise.all(
    clauses.map((clause) =>
      executeBuyerSearchFromIntent(ctx, clause, previousSourcing),
    ),
  );

  return { groups };
}

export const buyerChatPreviousListingValidator = v.object({
  certifications: v.optional(v.array(listingCertificationValidator)),
  cooperativeName: v.string(),
  county: v.string(),
  crop: v.string(),
  description: v.optional(v.string()),
  grade: v.optional(v.string()),
  harvestWindowLabel: v.optional(v.string()),
  listingId: v.id("listings"),
  minOrderKg: v.optional(v.number()),
  packaging: v.optional(listingPackagingValidator),
  packUnitKg: v.optional(v.number()),
  pricePerKg: v.number(),
  quantityKg: v.number(),
  sizeOrCalibre: v.optional(v.string()),
  status: v.union(
    v.literal("active"),
    v.literal("sold_out"),
    v.literal("expired"),
  ),
  tags: v.optional(v.array(listingTagValidator)),
  variety: v.optional(v.string()),
});

export type BuyerChatPreviousSourcingContextValidated = {
  crops: string[];
  intent: BuyerSearchIntent;
  listingCount: number;
  listings: Array<{
    certifications?: Doc<"listings">["certifications"];
    cooperativeName: string;
    county: string;
    crop: string;
    description?: string;
    grade?: string;
    harvestWindowLabel?: string;
    listingId: Id<"listings">;
    minOrderKg?: number;
    packaging?: Doc<"listings">["packaging"];
    packUnitKg?: number;
    pricePerKg: number;
    quantityKg: number;
    sizeOrCalibre?: string;
    status: "active" | "expired" | "sold_out";
    tags?: Doc<"listings">["tags"];
    variety?: string;
  }>;
};
