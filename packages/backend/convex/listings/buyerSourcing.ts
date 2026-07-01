"use node";

import { v } from "convex/values";

import { action, internalAction } from "../_generated/server";
import { buyerChatRequestContextValidator } from "./buyerChatContext";
import { executeBuyerChatTurn } from "./buyerChatOrchestrate";
import type { BuyerSearchIntent } from "./buyerChatParse";
import { buyerOrderDraftValidator } from "./buyerOrderDraftValidators";
import { executeBuyerSearchFromIntent } from "./buyerSearchExecute";
import { listingSearchResultValidator, type ListingSearchResultRow } from "./search";

const buyerSourcingMetaValidator = v.object({
  excludedSoldOutCount: v.number(),
  ragCandidateCount: v.number(),
  resultCount: v.number(),
});

export const buyerSourcingSearchResponseValidator = v.object({
  assistantText: v.optional(v.string()),
  intent: v.object({
    county: v.optional(v.string()),
    crop: v.optional(v.string()),
    maxPricePerKg: v.optional(v.number()),
    minQuantityKg: v.optional(v.number()),
    pricePreference: v.optional(
      v.union(v.literal("cheapest"), v.literal("most_expensive")),
    ),
    refinePreviousResults: v.optional(v.boolean()),
    resultLimit: v.optional(v.number()),
    searchText: v.string(),
  }),
  meta: buyerSourcingMetaValidator,
  orderDraft: v.optional(buyerOrderDraftValidator),
  results: v.array(listingSearchResultValidator),
});

export type BuyerSourcingSearchResponse = {
  assistantText?: string;
  intent: BuyerSearchIntent;
  meta: {
    excludedSoldOutCount: number;
    ragCandidateCount: number;
    resultCount: number;
  };
  orderDraft?: {
    lines: Array<{
      issue?: "ambiguous" | "insufficient_stock" | "not_active" | "not_found";
      listing?: ListingSearchResultRow;
      quantityKg: number;
      request: {
        cooperativeName?: string;
        county?: string;
        crop: string;
        grade?: string;
        listingRef?: number;
        quantityKg: number;
      };
    }>;
    summaryText: string;
  };
  results: ListingSearchResultRow[];
};

export { buyerChatRequestContextValidator, executeBuyerSearchFromIntent };

export const runBuyerSourcingSearch = internalAction({
  args: {
    chatContext: buyerChatRequestContextValidator,
  },
  returns: buyerSourcingSearchResponseValidator,
  handler: async (ctx, args): Promise<BuyerSourcingSearchResponse> => {
    return await executeBuyerChatTurn(ctx, args);
  },
});

export const searchForBuyerChat = action({
  args: {
    chatContext: buyerChatRequestContextValidator,
  },
  returns: buyerSourcingSearchResponseValidator,
  handler: async (ctx, args): Promise<BuyerSourcingSearchResponse> => {
    return await executeBuyerChatTurn(ctx, args);
  },
});
