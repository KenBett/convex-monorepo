"use node";

import { generateObject } from "ai";
import { v } from "convex/values";

import { internalAction } from "../_generated/server";
import {
  listingCertificationValidator,
  listingHardFilterTagValidator,
  listingPackagingValidator,
  listingTagValidator,
} from "../lib/listingAttributes";
import { answerModel } from "../lib/rag";
import {
  buyerSearchIntentParseSchema,
  type BuyerSearchIntentWithRefinement,
} from "./buyerSearchIntentParse";
import {
  normalizeBuyerSearchIntent,
  SEARCH_INTENT_TOOL_RULES,
} from "./buyerSearchIntentNormalize";

export const buyerSearchIntentValidator = v.object({
  county: v.optional(v.string()),
  crop: v.optional(v.string()),
  excludePreviousListings: v.optional(v.boolean()),
  grade: v.optional(v.string()),
  maxPricePerKg: v.optional(v.number()),
  minQuantityKg: v.optional(v.number()),
  pricePreference: v.optional(
    v.union(v.literal("cheapest"), v.literal("most_expensive")),
  ),
  refinePreviousResults: v.optional(v.boolean()),
  resultLimit: v.optional(v.number()),
  searchText: v.string(),
  tags: v.optional(v.array(listingHardFilterTagValidator)),
});

export type BuyerSearchIntent = BuyerSearchIntentWithRefinement;

const buyerChatPreviousListingValidator = v.object({
  certifications: v.optional(v.array(listingCertificationValidator)),
  cooperativeName: v.string(),
  county: v.string(),
  crop: v.string(),
  description: v.optional(v.string()),
  grade: v.optional(v.string()),
  harvestWindowLabel: v.optional(v.string()),
  listingId: v.id("listings"),
  minOrderKg: v.optional(v.number()),
  packaging: v.optional(listingPackagingValidator),
  packUnitKg: v.optional(v.number()),
  pricePerKg: v.number(),
  quantityKg: v.number(),
  sizeOrCalibre: v.optional(v.string()),
  status: v.union(
    v.literal("active"),
    v.literal("sold_out"),
    v.literal("expired"),
  ),
  tags: v.optional(v.array(listingTagValidator)),
  variety: v.optional(v.string()),
});

const buyerChatPreviousContextValidator = v.object({
  crops: v.array(v.string()),
  intent: buyerSearchIntentValidator,
  listingCount: v.number(),
  listings: v.array(buyerChatPreviousListingValidator),
});

const PARSE_SYSTEM_PROMPT = `You extract structured search parameters for a Kenyan produce marketplace buyer.

${SEARCH_INTENT_TOOL_RULES}`;

/** Standalone LLM intent parse — prefer orchestrator searchListings tool on the hot path. */
export const parseBuyerQuery = internalAction({
  args: {
    conversationTranscript: v.optional(v.string()),
    previousContext: v.optional(buyerChatPreviousContextValidator),
    query: v.string(),
  },
  returns: buyerSearchIntentValidator,
  handler: async (_ctx, args): Promise<BuyerSearchIntent> => {
    const query = args.query.trim();
    if (query.length === 0) {
      throw new Error("Search query is required");
    }

    const previousSummary = args.previousContext
      ? [
          "Previous search context:",
          `- crop: ${args.previousContext.intent.crop ?? "none"}`,
          `- county: ${args.previousContext.intent.county ?? "none"}`,
          `- listings shown: ${args.previousContext.listingCount}`,
          `- crops in results: ${args.previousContext.crops.join(", ") || "none"}`,
          args.previousContext.listings
            .map(
              (listing, index) =>
                `${index + 1}. ${listing.crop} from ${listing.cooperativeName}${listing.grade ? ` grade ${listing.grade}` : ""} @ KES ${listing.pricePerKg}/kg (${listing.listingId})`,
            )
            .join("\n"),
        ].join("\n")
      : "Previous search context: none";

    const transcript = args.conversationTranscript?.trim()
      ? args.conversationTranscript.trim()
      : `Buyer: ${query}`;

    const { object } = await generateObject({
      model: answerModel,
      prompt: [
        "Conversation so far:",
        transcript,
        "",
        "Latest buyer message:",
        query,
        "",
        previousSummary,
      ].join("\n"),
      schema: buyerSearchIntentParseSchema,
      system: PARSE_SYSTEM_PROMPT,
    });

    return normalizeBuyerSearchIntent(object, query, args.previousContext);
  },
});
