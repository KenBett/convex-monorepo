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
  grade?: string;
  maxPricePerKg?: number;
  minQuantityKg?: number;
  pricePreference?: "cheapest" | "most_expensive";
  refinePreviousResults?: boolean;
  resultLimit?: number;
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

/** One distinct crop/county/grade request within a compound buyer message. */
export interface BuyerSearchGroup {
  intent: BuyerSearchIntent;
  listings: BuyerSourcingListingResult[];
}

export interface BuyerSourcingStreamData {
  intent: BuyerSearchIntent;
  listings: BuyerSourcingListingResult[];
  meta: BuyerSourcingMeta;
  /**
   * One entry per distinct clause the buyer asked for; length 1 for a simple search.
   * Optional because chat history persisted before this field existed won't have it.
   */
  searchGroups?: BuyerSearchGroup[];
}

export type BuyerChatStatusPhase = "working" | "searching" | "ordering";

export interface BuyerChatStatusStreamData {
  phase: BuyerChatStatusPhase;
}

/** Live availability from Convex — `deleted` when the farmer removed the listing. */
export type ChatListingLiveStatus = ListingStatus | "deleted";

export interface ChatListingAvailability {
  listingId: string;
  status: ChatListingLiveStatus;
}

/** What the buyer asked to order (parsed from natural language). */
export interface BuyerOrderLineRequest {
  cooperativeName?: string;
  county?: (typeof COUNTIES)[number];
  crop: (typeof CROP_TYPES)[number];
  grade?: string;
  /** 1-based index into listings from the previous assistant message. */
  listingRef?: number;
  quantityKg: number;
}

export type BuyerOrderDraftIssue =
  | "ambiguous"
  | "insufficient_stock"
  | "not_active"
  | "not_found";

export interface BuyerOrderDraftLine {
  issue?: BuyerOrderDraftIssue;
  listing?: BuyerSourcingListingResult;
  quantityKg: number;
  request: BuyerOrderLineRequest;
}

export interface BuyerOrderDraft {
  lines: BuyerOrderDraftLine[];
  summaryText: string;
}

export interface BuyerOrderDraftStreamData {
  orderDraft: BuyerOrderDraft;
}
