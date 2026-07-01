"use node";

import { action, internalAction } from "../_generated/server";
import { buyerChatRequestContextValidator } from "./buyerChatContext";
import {
  buyerChatTurnResponseValidator,
  executeBuyerChatTurn,
  type BuyerChatTurnResult,
} from "./buyerChatOrchestrate";
import { executeBuyerSearchFromIntent } from "./buyerSearchExecute";

/** Kept as the historical name for this action's response shape. */
export const buyerSourcingSearchResponseValidator = buyerChatTurnResponseValidator;
export type BuyerSourcingSearchResponse = BuyerChatTurnResult;

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
