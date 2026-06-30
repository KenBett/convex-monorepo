import { v } from "convex/values";

import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
import {
  listingSearchResultValidator,
  type ListingSearchResultRow,
  runListingSemanticSearch,
} from "./search";
import {
  buyerSearchIntentValidator,
  type BuyerSearchIntent,
} from "./buyerChatParse";

const buyerSourcingMetaValidator = v.object({
  excludedSoldOutCount: v.number(),
  ragCandidateCount: v.number(),
  resultCount: v.number(),
});

export const buyerSourcingSearchResponseValidator = v.object({
  intent: buyerSearchIntentValidator,
  meta: buyerSourcingMetaValidator,
  results: v.array(listingSearchResultValidator),
});

function applyIntentFilters(
  results: ListingSearchResultRow[],
  intent: BuyerSearchIntent,
): ListingSearchResultRow[] {
  return results.filter((result) => {
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

export const runBuyerSourcingSearch = internalAction({
  args: {
    query: v.string(),
  },
  returns: buyerSourcingSearchResponseValidator,
  handler: async (ctx, args): Promise<{
    intent: BuyerSearchIntent;
    meta: {
      excludedSoldOutCount: number;
      ragCandidateCount: number;
      resultCount: number;
    };
    results: ListingSearchResultRow[];
  }> => {
    await ctx.runQuery(internal.listings.search.verifyBuyerAccess, {});

    const intent: BuyerSearchIntent = await ctx.runAction(
      internal.listings.buyerChatParse.parseBuyerQuery,
      {
        query: args.query,
      },
    );

    const { ragCandidateCount, results: hydratedResults } =
      await runListingSemanticSearch(ctx, {
        crop: intent.crop,
        limit: 8,
        query: intent.searchText || args.query.trim(),
      });

    const results = applyIntentFilters(hydratedResults, intent);

    return {
      intent,
      meta: {
        excludedSoldOutCount: Math.max(0, ragCandidateCount - hydratedResults.length),
        ragCandidateCount,
        resultCount: results.length,
      },
      results,
    };
  },
});

export const searchForBuyerChat = action({
  args: {
    query: v.string(),
  },
  returns: buyerSourcingSearchResponseValidator,
  handler: async (ctx, args): Promise<{
    intent: BuyerSearchIntent;
    meta: {
      excludedSoldOutCount: number;
      ragCandidateCount: number;
      resultCount: number;
    };
    results: ListingSearchResultRow[];
  }> => {
    return await ctx.runAction(
      internal.listings.buyerSourcing.runBuyerSourcingSearch,
      { query: args.query },
    );
  },
});
