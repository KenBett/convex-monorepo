import {
  COUNTIES,
  CROP_TYPES,
  LISTING_CERTIFICATIONS,
  LISTING_HARD_FILTER_TAGS,
  LISTING_PACKAGING,
  type BuyerSearchIntent,
  type ListingCertification,
  type ListingHardFilterTag,
  type ListingPackaging,
} from "@repo/types";
import { jsonSchema } from "ai";

export type BuyerSearchPricePreference = "cheapest" | "most_expensive";

export type ParsedBuyerSearchIntent = {
  certifications: ListingCertification[] | null;
  county: (typeof COUNTIES)[number] | null;
  crop: (typeof CROP_TYPES)[number] | null;
  grade: string | null;
  maxPricePerKg: number | null;
  minQuantityKg: number | null;
  packaging: ListingPackaging | null;
  pricePreference: BuyerSearchPricePreference | null;
  refinePreviousResults: boolean;
  resultLimit: number | null;
  searchText: string;
  tags: ListingHardFilterTag[] | null;
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
    tags: {
      type: ["array", "null"],
      items: {
        type: "string",
        enum: [...LISTING_HARD_FILTER_TAGS],
      },
    },
    certifications: {
      type: ["array", "null"],
      items: {
        type: "string",
        enum: [...LISTING_CERTIFICATIONS],
      },
    },
    packaging: {
      type: ["string", "null"],
      enum: [...LISTING_PACKAGING, null],
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
    "tags",
    "certifications",
    "packaging",
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
  if (parsed.tags != null && parsed.tags.length > 0) intent.tags = parsed.tags;
  if (parsed.certifications != null && parsed.certifications.length > 0) {
    intent.certifications = parsed.certifications;
  }
  if (parsed.packaging != null) intent.packaging = parsed.packaging;
  return intent;
}
