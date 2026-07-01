import { COUNTIES, CROP_TYPES, type CropType } from "@repo/types";

import { assertValidCounty, assertValidCrop } from "../lib/listings";
import {
  toBuyerSearchIntent,
  type ParsedBuyerSearchIntent,
} from "./buyerSearchIntentParse";
import type { BuyerSearchIntent } from "./buyerChatParse";

export type BuyerSearchIntentPreviousContext = {
  crops: string[];
  intent: {
    county?: string;
    crop?: string;
    maxPricePerKg?: number;
    minQuantityKg?: number;
  };
  listingCount: number;
};

function normalizeSearchText(
  intent: BuyerSearchIntent,
  query: string,
): BuyerSearchIntent {
  const searchText = intent.searchText.trim() || intent.crop || query.trim();
  return { ...intent, searchText };
}

function coerceCrop(crop: string): CropType {
  assertValidCrop(crop);
  return crop as CropType;
}

function coerceCounty(county: string): (typeof COUNTIES)[number] {
  assertValidCounty(county);
  return county as (typeof COUNTIES)[number];
}

/** Detect an explicit crop in the buyer's raw message (overrides stale chat context). */
export function extractCropFromQuery(query: string): CropType | undefined {
  const normalized = query.toLowerCase();

  if (/\bcorn\b/.test(normalized)) {
    return "maize";
  }

  for (const crop of CROP_TYPES) {
    const pattern = new RegExp(`\\b${crop}\\b`, "i");
    if (pattern.test(query)) {
      return crop;
    }
  }

  return undefined;
}

function applyQueryCropOverride(
  intent: BuyerSearchIntent,
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent {
  const cropFromQuery = extractCropFromQuery(query);
  if (!cropFromQuery) {
    return intent;
  }

  const nextIntent: BuyerSearchIntent = {
    ...intent,
    crop: cropFromQuery,
  };

  const isNewCropSearch =
    !previousContext ||
    previousContext.crops.length === 0 ||
    !previousContext.crops.includes(cropFromQuery);

  if (isNewCropSearch) {
    nextIntent.refinePreviousResults = false;
  }

  return nextIntent;
}

function inheritPreviousIntent(
  intent: BuyerSearchIntent,
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent {
  if (!previousContext) {
    return intent;
  }

  const cropFromQuery = extractCropFromQuery(query);
  const nextIntent = { ...intent };

  if (!nextIntent.crop && !cropFromQuery && previousContext.intent.crop) {
    nextIntent.crop = coerceCrop(previousContext.intent.crop);
  }
  if (!nextIntent.county && previousContext.intent.county) {
    nextIntent.county = coerceCounty(previousContext.intent.county);
  }
  if (!nextIntent.minQuantityKg && previousContext.intent.minQuantityKg) {
    nextIntent.minQuantityKg = previousContext.intent.minQuantityKg;
  }
  if (!nextIntent.maxPricePerKg && previousContext.intent.maxPricePerKg) {
    nextIntent.maxPricePerKg = previousContext.intent.maxPricePerKg;
  }

  if (
    nextIntent.refinePreviousResults &&
    !nextIntent.crop &&
    previousContext.crops[0]
  ) {
    nextIntent.crop = coerceCrop(previousContext.crops[0]);
  }

  if (
    nextIntent.refinePreviousResults &&
    nextIntent.crop &&
    previousContext.crops.length > 0 &&
    !previousContext.crops.includes(nextIntent.crop)
  ) {
    nextIntent.refinePreviousResults = false;
  }

  return nextIntent;
}

/** Normalize orchestrator or parser output into a validated BuyerSearchIntent. */
export function normalizeBuyerSearchIntent(
  parsed: ParsedBuyerSearchIntent,
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent {
  let intent = toBuyerSearchIntent(parsed);
  intent = applyQueryCropOverride(intent, query, previousContext);
  intent = inheritPreviousIntent(intent, query, previousContext);
  intent = normalizeSearchText(intent, query);

  if (intent.crop) {
    assertValidCrop(intent.crop);
  }
  if (intent.county) {
    assertValidCounty(intent.county);
  }

  return intent;
}

/** Minimal fallback intent when the orchestrator does not invoke searchListings. */
export function fallbackBuyerSearchIntent(
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent {
  return normalizeBuyerSearchIntent(
    {
      crop: null,
      county: null,
      maxPricePerKg: null,
      minQuantityKg: null,
      searchText: query,
      refinePreviousResults: false,
      pricePreference: null,
      resultLimit: null,
    },
    query,
    previousContext,
  );
}

export const SEARCH_INTENT_TOOL_RULES = `When calling searchListings, populate structured search fields directly:
- Map user language to these crops only: ${CROP_TYPES.join(", ")}. Examples: corn → maize.
- If the buyer mentions a crop in the latest message, always set crop explicitly — never reuse a crop from earlier turns.
- If no crop is in the latest message, inherit from previous search context only when refining those same results.
- When the buyer asks about a different crop than earlier results, set refinePreviousResults: false and run a fresh search.
- Counties must be one of: ${COUNTIES.join(", ")} when mentioned.
- Put remaining descriptive terms in searchText (quantity hints, quality, urgency).
- searchText must never be empty.
- minQuantityKg and maxPricePerKg when clearly stated; otherwise omit.
- refinePreviousResults: true when referring to earlier results ("cheaper one", "show me one").
- pricePreference: "cheapest" or "most_expensive" when refining by price.
- resultLimit: 1 when the buyer asks for a single option.
- For brand-new searches with explicit crop or location, refinePreviousResults: false.`;
