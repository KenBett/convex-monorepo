import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { matchesGrade } from "../lib/listings";
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
    description?: string;
    grade?: string;
    listingId: Id<"listings">;
    pricePerKg: number;
    quantityKg: number;
    status: "active" | "expired" | "sold_out";
  }>;
};

/** Crop, county, and grade are all strict AND filters — a mismatch on any one excludes the result. */
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
    if (!matchesGrade(result.grade, intent.grade)) {
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

const SEARCH_TEXT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "are",
  "buy",
  "find",
  "for",
  "from",
  "get",
  "kg",
  "kgs",
  "kilo",
  "kilos",
  "looking",
  "me",
  "need",
  "of",
  "only",
  "order",
  "please",
  "show",
  "some",
  "the",
  "want",
  "with",
]);

/** Descriptive words left over once crop/county/grade/quantity extraction has happened. */
function extractDescriptiveTerms(searchText: string): string[] {
  return Array.from(
    new Set(
      searchText
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(
          (term) => term.length > 2 && !SEARCH_TEXT_STOP_WORDS.has(term),
        ),
    ),
  );
}

/** Fraction (0..1) of descriptive terms found in the listing's own description text. */
function computeDescriptionBonus(description: string, terms: string[]): number {
  if (terms.length === 0) {
    return 0;
  }

  const normalizedDescription = description.toLowerCase();
  const matchCount = terms.filter((term) =>
    normalizedDescription.includes(term),
  ).length;

  return matchCount / terms.length;
}

/**
 * Blend the RAG vector score with a description-keyword overlap bonus so results that are
 * both structurally correct (crop/county/grade already enforced above) and textually relevant
 * to the buyer's remaining descriptive words rank first.
 */
function rankByRelevance(
  results: ListingSearchResultRow[],
  intent: BuyerSearchIntent,
): ListingSearchResultRow[] {
  const terms = extractDescriptiveTerms(intent.searchText);
  if (terms.length === 0) {
    return results;
  }

  return [...results].sort((left, right) => {
    const leftScore =
      left.score + computeDescriptionBonus(left.description, terms) * 0.25;
    const rightScore =
      right.score + computeDescriptionBonus(right.description, terms) * 0.25;
    return rightScore - leftScore;
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
    const rankedResults = rankByRelevance(filteredResults, intent);
    const sortedResults = sortResultsByPricePreference(
      rankedResults,
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
  const rankedResults = rankByRelevance(filteredResults, intent);
  const sortedResults = sortResultsByPricePreference(
    rankedResults,
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

export type BuyerSearchGroupResult = {
  intent: BuyerSearchIntent;
  meta: {
    excludedSoldOutCount: number;
    ragCandidateCount: number;
    resultCount: number;
  };
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
  cooperativeName: v.string(),
  county: v.string(),
  crop: v.string(),
  description: v.optional(v.string()),
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
    description?: string;
    grade?: string;
    listingId: Id<"listings">;
    pricePerKg: number;
    quantityKg: number;
    status: "active" | "expired" | "sold_out";
  }>;
};
