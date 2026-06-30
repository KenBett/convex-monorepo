import { z } from "zod";

import { COUNTIES, CROP_TYPES, type ListingStatus } from "./marketplace";

/** Schema for LLM structured output — nullable fields satisfy OpenAI strict JSON schema. */
export const buyerSearchIntentSchema = z.object({
  crop: z.enum(CROP_TYPES).nullable(),
  county: z.enum(COUNTIES).nullable(),
  maxPricePerKg: z.number().positive().nullable(),
  minQuantityKg: z.number().positive().nullable(),
  searchText: z.string(),
});

export type BuyerSearchIntent = {
  county?: (typeof COUNTIES)[number];
  crop?: (typeof CROP_TYPES)[number];
  maxPricePerKg?: number;
  minQuantityKg?: number;
  searchText: string;
};

export function fromParsedBuyerSearchIntent(
  parsed: z.infer<typeof buyerSearchIntentSchema>,
): BuyerSearchIntent {
  const intent: BuyerSearchIntent = { searchText: parsed.searchText };
  if (parsed.crop != null) intent.crop = parsed.crop;
  if (parsed.county != null) intent.county = parsed.county;
  if (parsed.maxPricePerKg != null) intent.maxPricePerKg = parsed.maxPricePerKg;
  if (parsed.minQuantityKg != null) intent.minQuantityKg = parsed.minQuantityKg;
  return intent;
}

export interface BuyerSourcingListingResult {
  cooperativeName: string;
  county: string;
  crop: string;
  description: string;
  grade?: string;
  imageUrl?: string | null;
  listingId: string;
  pricePerKg: number;
  quantityKg: number;
  score: number;
  snippet: string;
  status: ListingStatus;
  title?: string;
}

export interface BuyerSourcingMeta {
  excludedSoldOutCount: number;
  ragCandidateCount: number;
  resultCount: number;
}

export interface BuyerSourcingSearchResponse {
  intent: BuyerSearchIntent;
  meta: BuyerSourcingMeta;
  results: BuyerSourcingListingResult[];
}

export interface BuyerSourcingStreamData {
  intent: BuyerSearchIntent;
  listings: BuyerSourcingListingResult[];
  meta: BuyerSourcingMeta;
}
