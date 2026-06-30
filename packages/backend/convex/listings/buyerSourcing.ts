import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalAction, type ActionCtx } from "../_generated/server";
import {
  buyerSearchIntentValidator,
  type BuyerSearchIntent,
} from "./buyerChatParse";
import {
  listingSearchResultValidator,
  type ListingSearchResultRow,
  runListingSemanticSearch,
} from "./search";

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

const buyerChatPreviousListingValidator = v.object({
  crop: v.string(),
  listingId: v.id("listings"),
  pricePerKg: v.number(),
});

const buyerChatPreviousContextValidator = v.object({
  crops: v.array(v.string()),
  intent: buyerSearchIntentValidator,
  listingCount: v.number(),
  listings: v.array(buyerChatPreviousListingValidator),
});

export const buyerChatRequestContextValidator = v.object({
  conversationTranscript: v.string(),
  latestUserMessage: v.string(),
  previousSourcing: v.optional(buyerChatPreviousContextValidator),
});

type BuyerChatPreviousSourcingContext = {
  crops: string[];
  intent: {
    county?: string;
    crop?: string;
    maxPricePerKg?: number;
    minQuantityKg?: number;
    pricePreference?: BuyerSearchIntent["pricePreference"];
    refinePreviousResults?: boolean;
    resultLimit?: number;
    searchText: string;
  };
  listingCount: number;
  listings: Array<{
    crop: string;
    listingId: Id<"listings">;
    pricePerKg: number;
  }>;
};

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
  previousSourcing: BuyerChatPreviousSourcingContext,
): Promise<ListingSearchResultRow[]> {
  const candidates = previousSourcing.listings.map((listing) => ({
    listingId: listing.listingId,
    score: 0,
    snippet: `${listing.crop} listing`,
  }));

  return await ctx.runQuery(internal.listings.search.hydrateSearchCandidates, {
    candidates,
    requiredCrop: previousSourcing.intent.crop,
  });
}

export const runBuyerSourcingSearch = internalAction({
  args: {
    chatContext: buyerChatRequestContextValidator,
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

    const query = args.chatContext.latestUserMessage.trim();
    if (query.length === 0) {
      throw new Error("Search query is required");
    }

    const intent: BuyerSearchIntent = await ctx.runAction(
      internal.listings.buyerChatParse.parseBuyerQuery,
      {
        conversationTranscript: args.chatContext.conversationTranscript,
        previousContext: args.chatContext.previousSourcing,
        query,
      },
    );

    if (intent.refinePreviousResults && args.chatContext.previousSourcing) {
      const hydratedResults = await hydratePreviousListings(
        ctx,
        args.chatContext.previousSourcing,
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
            args.chatContext.previousSourcing.listings.length - hydratedResults.length,
          ),
          ragCandidateCount: args.chatContext.previousSourcing.listings.length,
          resultCount: results.length,
        },
        results,
      };
    }

    const { ragCandidateCount, results: hydratedResults } =
      await runListingSemanticSearch(ctx, {
        crop: intent.crop,
        limit: 8,
        query: intent.searchText || query,
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
  },
});

export const searchForBuyerChat = action({
  args: {
    chatContext: buyerChatRequestContextValidator,
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
      { chatContext: args.chatContext },
    );
  },
});
