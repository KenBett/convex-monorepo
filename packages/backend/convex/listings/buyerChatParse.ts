"use node";

import { COUNTIES, CROP_TYPES } from "@repo/types";
import { generateObject } from "ai";
import { v } from "convex/values";

import { internalAction } from "../_generated/server";
import { assertValidCounty, assertValidCrop } from "../lib/listings";
import { answerModel } from "../lib/rag";
import {
  buyerSearchIntentParseSchema,
  toBuyerSearchIntent,
} from "./buyerSearchIntentParse";

export const buyerSearchIntentValidator = v.object({
  county: v.optional(v.string()),
  crop: v.optional(v.string()),
  maxPricePerKg: v.optional(v.number()),
  minQuantityKg: v.optional(v.number()),
  searchText: v.string(),
});

export type BuyerSearchIntent = {
  county?: string;
  crop?: string;
  maxPricePerKg?: number;
  minQuantityKg?: number;
  searchText: string;
};

const PARSE_SYSTEM_PROMPT = `You extract structured search parameters for a Kenyan produce marketplace buyer.

Rules:
- Map user language to these crops only: ${CROP_TYPES.join(", ")}. Examples: corn → maize.
- If the buyer mentions a crop, set crop explicitly. Do not leave crop implicit in searchText alone.
- If no crop is mentioned, set crop to null.
- Counties must be one of: ${COUNTIES.join(", ")}.
- Put remaining descriptive terms in searchText (quantity hints, quality, urgency, etc.).
- searchText must never be empty: repeat the crop name, county, or a short phrase from the query when nothing else applies.
- minQuantityKg and maxPricePerKg are numeric filters when clearly stated; otherwise set them to null.
- Set county to null when not mentioned.`;

function normalizeSearchText(
  intent: BuyerSearchIntent,
  query: string,
): BuyerSearchIntent {
  const searchText = intent.searchText.trim() || intent.crop || query.trim();
  return { ...intent, searchText };
}

export const parseBuyerQuery = internalAction({
  args: {
    query: v.string(),
  },
  returns: buyerSearchIntentValidator,
  handler: async (_ctx, args): Promise<BuyerSearchIntent> => {
    const query = args.query.trim();
    if (query.length === 0) {
      throw new Error("Search query is required");
    }

    const { object } = await generateObject({
      model: answerModel,
      prompt: query,
      schema: buyerSearchIntentParseSchema,
      system: PARSE_SYSTEM_PROMPT,
    });

    const intent = toBuyerSearchIntent(object);

    if (intent.crop) {
      assertValidCrop(intent.crop);
    }
    if (intent.county) {
      assertValidCounty(intent.county);
    }

    return normalizeSearchText(intent, query);
  },
});
