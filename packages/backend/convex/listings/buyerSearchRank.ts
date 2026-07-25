import { stripInternalListingMarkers } from "@repo/types";

import { matchesGrade } from "../lib/listings";
import type { BuyerSearchIntent } from "./buyerChatParse";
import type { ListingSearchResultRow } from "./search";

/** Crop, county, grade, and hard tags are all strict AND filters — a mismatch excludes the result. */
export function applyIntentFilters(
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
export function rankByRelevance(
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

export function sortResultsByPricePreference(
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

export function limitResults(
  results: ListingSearchResultRow[],
  resultLimit?: number,
): ListingSearchResultRow[] {
  if (!resultLimit || resultLimit <= 0) {
    return results;
  }

  return results.slice(0, resultLimit);
}
