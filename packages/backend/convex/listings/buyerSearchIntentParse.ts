import { COUNTIES, CROP_TYPES, type BuyerSearchIntent } from "@repo/types";
import { jsonSchema } from "ai";

export type BuyerSearchPricePreference = "cheapest" | "most_expensive";

export type ParsedBuyerSearchIntent = {
  county: (typeof COUNTIES)[number] | null;
  crop: (typeof CROP_TYPES)[number] | null;
  grade: string | null;
  maxPricePerKg: number | null;
  minQuantityKg: number | null;
  pricePreference: BuyerSearchPricePreference | null;
  refinePreviousResults: boolean;
  resultLimit: number | null;
  searchText: string;
};

/** OpenAI strict structured output requires every property in `required`. */
export const buyerSearchIntentParseSchema = jsonSchema<ParsedBuyerSearchIntent>({
  type: "object",
  properties: {
    crop: {
      type: ["string", "null"],
      enum: [...CROP_TYPES, null],
    },
    county: {
      type: ["string", "null"],
      enum: [...COUNTIES, null],
    },
    grade: {
      type: ["string", "null"],
    },
    maxPricePerKg: {
      type: ["number", "null"],
    },
    minQuantityKg: {
      type: ["number", "null"],
    },
    searchText: {
      type: "string",
    },
    refinePreviousResults: {
      type: "boolean",
    },
    pricePreference: {
      type: ["string", "null"],
      enum: ["cheapest", "most_expensive", null],
    },
    resultLimit: {
      type: ["number", "null"],
    },
  },
  required: [
    "crop",
    "county",
    "grade",
    "maxPricePerKg",
    "minQuantityKg",
    "searchText",
    "refinePreviousResults",
    "pricePreference",
    "resultLimit",
  ],
  additionalProperties: false,
});

export type BuyerSearchIntentWithRefinement = BuyerSearchIntent & {
  pricePreference?: BuyerSearchPricePreference;
  refinePreviousResults?: boolean;
  resultLimit?: number;
};

export function toBuyerSearchIntent(
  parsed: ParsedBuyerSearchIntent,
): BuyerSearchIntentWithRefinement {
  const intent: BuyerSearchIntentWithRefinement = {
    searchText: parsed.searchText,
  };
  if (parsed.crop != null) intent.crop = parsed.crop;
  if (parsed.county != null) intent.county = parsed.county;
  if (parsed.grade != null) intent.grade = parsed.grade;
  if (parsed.maxPricePerKg != null) intent.maxPricePerKg = parsed.maxPricePerKg;
  if (parsed.minQuantityKg != null) intent.minQuantityKg = parsed.minQuantityKg;
  if (parsed.refinePreviousResults) intent.refinePreviousResults = true;
  if (parsed.pricePreference != null) intent.pricePreference = parsed.pricePreference;
  if (parsed.resultLimit != null) intent.resultLimit = parsed.resultLimit;
  return intent;
}
