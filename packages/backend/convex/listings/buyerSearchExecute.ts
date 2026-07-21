import { v } from "convex/values";

import type { BuyerRetrievalMode } from "@repo/types";
import { stripInternalListingMarkers } from "@repo/types";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  listingCertificationValidator,
  listingPackagingValidator,
  listingTagValidator,
} from "../lib/listingAttributes";
import { matchesGrade } from "../lib/listings";
import type { BuyerSearchIntent } from "./buyerChatParse";
import {
  buildCompletedTrail,
  buildFilterLabels,
} from "./buyerChatTrail";
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

/** Crop, county, grade, and hard tags are all strict AND filters — a mismatch excludes the result. */
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
    if (intent.tags && intent.tags.length > 0) {
      const listingTags = new Set(result.tags ?? []);
      for (const tag of intent.tags) {
        if (!listingTags.has(tag)) {
          return false;
        }
      }
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
    return results.map((result) => ({
      ...result,
      snippet: buildMatchReason(result, intent, terms),
    }));
  }

  return [...results]
    .map((result) => {
      const descriptionBonus = computeDescriptionBonus(result.description, terms);
      return {
        ...result,
        score: Math.min(1, result.score + descriptionBonus * 0.25),
        snippet: buildMatchReason(result, intent, terms),
      };
    })
    .sort((left, right) => right.score - left.score);
}

/** One-line glass-box reason shown on listing cards. */
function buildMatchReason(
  result: ListingSearchResultRow,
  intent: BuyerSearchIntent,
  terms: string[],
): string {
  const description = stripInternalListingMarkers(result.description);
  if (terms.length > 0 && description.length > 0) {
    const sentences = description.split(/(?<=[.!?])\s+/);
    const scored = sentences
      .map((sentence) => ({
        hits: terms.filter((term) => sentence.toLowerCase().includes(term))
          .length,
        sentence,
      }))
      .filter((entry) => entry.hits > 0)
      .sort((left, right) => right.hits - left.hits);

    const best = scored[0]?.sentence;
    if (best) {
      return best.length > 140 ? `${best.slice(0, 137)}…` : best;
    }
  }

  const bits: string[] = [];
  if (result.variety) {
    bits.push(result.variety);
  }
  if (result.tags?.includes("organic")) {
    bits.push("organic");
  }
  if (intent.county && result.county === intent.county) {
    bits.push(`in ${result.county}`);
  } else if (result.county) {
    bits.push(result.county);
  }
  if (result.harvestWindowLabel) {
    bits.push(result.harvestWindowLabel);
  }

  if (bits.length > 0) {
    return bits.join(" · ");
  }

  const generic = stripInternalListingMarkers(result.snippet);
  if (
    generic.length > 0 &&
    !generic.startsWith("This listing offers") &&
    generic !== `${result.crop} — ${result.county}`
  ) {
    return generic.length > 140 ? `${generic.slice(0, 137)}…` : generic;
  }

  return `${result.crop} from ${result.cooperativeName} in ${result.county}`;
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
  const {
    ragCandidateCount,
    results: hydratedResults,
    retrievalMode,
  } = await runListingBrowseSearch(ctx, {
    crop: intent.crop,
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
