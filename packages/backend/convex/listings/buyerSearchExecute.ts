import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import type { BuyerSearchIntent } from "./buyerChatParse";
import {
  type ListingSearchResultRow,
  runListingSemanticSearch,
} from "./search";

type BuyerChatPreviousSourcingContext = {
  crops: string[];
  intent: BuyerSearchIntent;
  listingCount: number;
  listings: Array<{
    cooperativeName: string;
    county: string;
    crop: string;
    grade?: string;
    listingId: Id<"listings">;
    pricePerKg: number;
    quantityKg: number;
    status: "active" | "expired" | "sold_out";
  }>;
};

function applyIntentFilters(
  results: ListingSearchResultRow[],
  intent: BuyerSearchIntent,
): ListingSearchResultRow[] {
  return results.filter((result) => {
    if (intent.crop && result.crop !== intent.crop) {
      return false;
    }
    if (intent.county && result.county !== intent.county) {
      return false;
    }
    if (intent.minQuantityKg && result.quantityKg < intent.minQuantityKg) {
      return false;
    }
    if (intent.maxPricePerKg && result.pricePerKg > intent.maxPricePerKg) {
      return false;
    }
    return true;
  });
}

function sortResultsByPricePreference(
  results: ListingSearchResultRow[],
  pricePreference?: BuyerSearchIntent["pricePreference"],
): ListingSearchResultRow[] {
  if (!pricePreference) {
    return results;
  }

  const sorted = [...results];
  if (pricePreference === "cheapest") {
    sorted.sort((left, right) => left.pricePerKg - right.pricePerKg);
  } else {
    sorted.sort((left, right) => right.pricePerKg - left.pricePerKg);
  }
  return sorted;
}

function limitResults(
  results: ListingSearchResultRow[],
  resultLimit?: number,
): ListingSearchResultRow[] {
  if (!resultLimit || resultLimit <= 0) {
    return results;
  }

  return results.slice(0, resultLimit);
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
): Promise<{
  intent: BuyerSearchIntent;
  meta: {
    excludedSoldOutCount: number;
    ragCandidateCount: number;
    resultCount: number;
  };
  results: ListingSearchResultRow[];
}> {
  if (intent.refinePreviousResults && previousSourcing) {
    const hydratedResults = await hydratePreviousListings(
      ctx,
      intent,
      previousSourcing,
    );
    const filteredResults = applyIntentFilters(hydratedResults, intent);
    const sortedResults = sortResultsByPricePreference(
      filteredResults,
      intent.pricePreference,
    );
    const results = limitResults(sortedResults, intent.resultLimit);

    return {
      intent,
      meta: {
        excludedSoldOutCount: Math.max(
          0,
          previousSourcing.listings.length - hydratedResults.length,
        ),
        ragCandidateCount: previousSourcing.listings.length,
        resultCount: results.length,
      },
      results,
    };
  }

  const query = intent.searchText.trim();
  const { ragCandidateCount, results: hydratedResults } =
    await runListingSemanticSearch(ctx, {
      crop: intent.crop,
      limit: 8,
      query: query.length > 0 ? query : "produce",
    });

  const filteredResults = applyIntentFilters(hydratedResults, intent);
  const sortedResults = sortResultsByPricePreference(
    filteredResults,
    intent.pricePreference,
  );
  const results = limitResults(sortedResults, intent.resultLimit);

  return {
    intent,
    meta: {
      excludedSoldOutCount: Math.max(0, ragCandidateCount - hydratedResults.length),
      ragCandidateCount,
      resultCount: results.length,
    },
    results,
  };
}

export const buyerChatPreviousListingValidator = v.object({
  cooperativeName: v.string(),
  county: v.string(),
  crop: v.string(),
  grade: v.optional(v.string()),
  listingId: v.id("listings"),
  pricePerKg: v.number(),
  quantityKg: v.number(),
  status: v.union(
    v.literal("active"),
    v.literal("sold_out"),
    v.literal("expired"),
  ),
});

export type BuyerChatPreviousSourcingContextValidated = {
  crops: string[];
  intent: BuyerSearchIntent;
  listingCount: number;
  listings: Array<{
    cooperativeName: string;
    county: string;
    crop: string;
    grade?: string;
    listingId: Id<"listings">;
    pricePerKg: number;
    quantityKg: number;
    status: "active" | "expired" | "sold_out";
  }>;
};
