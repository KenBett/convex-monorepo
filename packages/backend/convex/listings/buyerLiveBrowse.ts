import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireBuyerProfile } from "../lib/listings";
import {
  buyerSearchIntentValidator,
  type BuyerSearchIntent,
} from "./buyerChatParse";
import { fallbackBuyerSearchIntent } from "./buyerSearchIntentNormalize";
import {
  applyIntentFilters,
  limitResults,
  rankByRelevance,
  sortResultsByPricePreference,
} from "./buyerSearchRank";
import {
  listingSearchResultValidator,
  loadActiveListingsByCrop,
  type ListingSearchResultRow,
} from "./search";

/** Minimum trimmed length before live browse hits indexed search. */
const LIVE_BROWSE_MIN_QUERY_LENGTH = 3;
const LIVE_BROWSE_DEFAULT_LIMIT = 8;
/** Cap hydrate work for composer preview (full chat may load more). */
const LIVE_BROWSE_CANDIDATE_CAP = 16;

export const liveBrowseSearchResponseValidator = v.object({
  intent: buyerSearchIntentValidator,
  results: v.array(listingSearchResultValidator),
});

export type LiveBrowseSearchResponse = {
  intent: BuyerSearchIntent;
  results: ListingSearchResultRow[];
};

/**
 * Lightweight deterministic browse for the composer live preview.
 * Indexed crop browse + hard filters only — no LLM, embeddings, or Node runtime.
 */
export const liveBrowseSearch = query({
  args: {
    limit: v.optional(v.number()),
    query: v.string(),
  },
  returns: liveBrowseSearchResponseValidator,
  handler: async (ctx, args): Promise<LiveBrowseSearchResponse> => {
    await requireBuyerProfile(ctx);

    const queryText = args.query.trim();
    if (queryText.length < LIVE_BROWSE_MIN_QUERY_LENGTH) {
      return {
        intent: { searchText: queryText },
        results: [],
      };
    }

    const intent = fallbackBuyerSearchIntent(queryText);
    const resultLimit = args.limit ?? LIVE_BROWSE_DEFAULT_LIMIT;
    intent.resultLimit = resultLimit;

    // No crop yet → wait for a recognizable crop before browsing.
    if (!intent.crop) {
      return {
        intent,
        results: [],
      };
    }

    const hydratedResults = await loadActiveListingsByCrop(
      ctx,
      intent.crop,
      LIVE_BROWSE_CANDIDATE_CAP,
    );
    const filteredResults = applyIntentFilters(hydratedResults, intent);
    const rankedResults = rankByRelevance(filteredResults, intent);
    const sortedResults = sortResultsByPricePreference(
      rankedResults,
      intent.pricePreference,
    );
    const results = limitResults(sortedResults, resultLimit);

    return {
      intent,
      results,
    };
  },
});
