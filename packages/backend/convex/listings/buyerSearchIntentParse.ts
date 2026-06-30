import { COUNTIES, CROP_TYPES, type BuyerSearchIntent } from "@repo/types";
import { jsonSchema } from "ai";

export type ParsedBuyerSearchIntent = {
  county: (typeof COUNTIES)[number] | null;
  crop: (typeof CROP_TYPES)[number] | null;
  maxPricePerKg: number | null;
  minQuantityKg: number | null;
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
    maxPricePerKg: {
      type: ["number", "null"],
    },
    minQuantityKg: {
      type: ["number", "null"],
    },
    searchText: {
      type: "string",
    },
  },
  required: ["crop", "county", "maxPricePerKg", "minQuantityKg", "searchText"],
  additionalProperties: false,
});

export function toBuyerSearchIntent(
  parsed: ParsedBuyerSearchIntent,
): BuyerSearchIntent {
  const intent: BuyerSearchIntent = { searchText: parsed.searchText };
  if (parsed.crop != null) intent.crop = parsed.crop;
  if (parsed.county != null) intent.county = parsed.county;
  if (parsed.maxPricePerKg != null) intent.maxPricePerKg = parsed.maxPricePerKg;
  if (parsed.minQuantityKg != null) intent.minQuantityKg = parsed.minQuantityKg;
  return intent;
}
