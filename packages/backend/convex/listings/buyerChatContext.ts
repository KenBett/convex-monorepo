import { v } from "convex/values";

import { buyerSearchIntentValidator } from "./buyerChatParse";
import { buyerChatPreviousListingValidator } from "./buyerSearchExecute";

const buyerChatPreviousContextValidator = v.object({
  crops: v.array(v.string()),
  intent: buyerSearchIntentValidator,
  listingCount: v.number(),
  listings: v.array(buyerChatPreviousListingValidator),
});

export const buyerChatRequestContextValidator = v.object({
  conversationListings: v.optional(v.array(buyerChatPreviousListingValidator)),
  conversationTranscript: v.string(),
  latestUserMessage: v.string(),
  previousSourcing: v.optional(buyerChatPreviousContextValidator),
});

export { buyerChatPreviousListingValidator };
