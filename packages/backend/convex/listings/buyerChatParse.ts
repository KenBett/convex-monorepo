"use node";

import { COUNTIES, CROP_TYPES, type CropType } from "@repo/types";
import { generateObject } from "ai";
import { v } from "convex/values";

import { internalAction } from "../_generated/server";
import { assertValidCounty, assertValidCrop } from "../lib/listings";
import { answerModel } from "../lib/rag";
import {
  buyerSearchIntentParseSchema,
  toBuyerSearchIntent,
  type BuyerSearchIntentWithRefinement,
} from "./buyerSearchIntentParse";

export const buyerSearchIntentValidator = v.object({
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
});

export type BuyerSearchIntent = BuyerSearchIntentWithRefinement;

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

const PARSE_SYSTEM_PROMPT = `You extract structured search parameters for a Kenyan produce marketplace buyer.

Rules:
- Map user language to these crops only: ${CROP_TYPES.join(", ")}. Examples: corn → maize, beans → beans.
- If the buyer mentions a crop, set crop explicitly. Do not leave crop implicit in searchText alone.
- If no crop is mentioned in the latest message, inherit crop from the previous search context when the buyer is refining earlier results.
- Counties must be one of: ${COUNTIES.join(", ")}.
- Put remaining descriptive terms in searchText (quantity hints, quality, urgency, etc.).
- searchText must never be empty: repeat the crop name, county, or a short phrase from the query when nothing else applies.
- minQuantityKg and maxPricePerKg are numeric filters when clearly stated; otherwise set them to null.
- Set county to null when not mentioned.

Follow-up / refinement rules:
- When the buyer refers to earlier results ("the cheaper one", "cheapest option", "show me one", "the other one", "most expensive"), set refinePreviousResults to true.
- When refinePreviousResults is true, keep the same crop as the previous search unless the buyer clearly asks for a different crop.
- pricePreference:
  - "cheapest" for cheaper / cheapest / lower price / less expensive
  - "most_expensive" for most expensive / pricier / higher price
  - null when not refining by price
- resultLimit:
  - 1 when the buyer asks for a single option ("one", "the cheaper one", "just show me one")
  - null otherwise
- If the latest message is a brand-new search with an explicit crop or location, set refinePreviousResults to false.`;

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

function inheritPreviousIntent(
  intent: BuyerSearchIntent,
  previousContext?: {
    crops: string[];
    intent: {
      county?: string;
      crop?: string;
      maxPricePerKg?: number;
      minQuantityKg?: number;
    };
    listingCount: number;
  },
): BuyerSearchIntent {
  if (!previousContext) {
    return intent;
  }

  const nextIntent = { ...intent };

  if (!nextIntent.crop && previousContext.intent.crop) {
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

  if (nextIntent.refinePreviousResults && !nextIntent.crop && previousContext.crops[0]) {
    nextIntent.crop = coerceCrop(previousContext.crops[0]);
  }

  return nextIntent;
}

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
              (listing) =>
                `- ${listing.crop} @ KES ${listing.pricePerKg}/kg (${listing.listingId})`,
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

    let intent = toBuyerSearchIntent(object);
    intent = inheritPreviousIntent(intent, args.previousContext);
    intent = normalizeSearchText(intent, query);

    if (intent.crop) {
      assertValidCrop(intent.crop);
    }
    if (intent.county) {
      assertValidCounty(intent.county);
    }

    return intent;
  },
});
