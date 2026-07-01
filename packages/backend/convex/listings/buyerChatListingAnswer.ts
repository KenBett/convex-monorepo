import type { BuyerChatPreviousListing } from "./buyerOrderResolve";
import { matchesCooperative } from "./buyerOrderResolve";
import { extractCropFromQuery } from "./buyerSearchIntentNormalize";

export type ListingMetadataField =
  | "cooperative"
  | "county"
  | "description"
  | "grade"
  | "price"
  | "quantity"
  | "status";

const METADATA_QUESTION_PATTERN =
  /\?(?:\s|$)|\b(what|which|how much|how many|tell me|who|where)\b/i;

const FIELD_PATTERNS: Array<{ field: ListingMetadataField; pattern: RegExp }> = [
  { field: "grade", pattern: /\bgrade\b/i },
  {
    field: "price",
    pattern: /\b(price|cost|how much|per kg|kes|shillings?)\b/i,
  },
  {
    field: "quantity",
    pattern: /\b(quantity|stock|available|how many kg|amount)\b/i,
  },
  { field: "county", pattern: /\b(county|location|where)\b/i },
  {
    field: "cooperative",
    pattern: /\b(cooperative|co-op|seller|farmer|who)\b/i,
  },
  { field: "status", pattern: /\bstatus\b/i },
  { field: "description", pattern: /\b(description|details?|about)\b/i },
];

const LISTING_REF_PATTERNS: Array<{ pattern: RegExp; ref: number }> = [
  { pattern: /\b(?:the )?(?:first|1st)\b/i, ref: 1 },
  { pattern: /\b(?:the )?(?:second|2nd)\b/i, ref: 2 },
  { pattern: /\b(?:the )?(?:third|3rd)\b/i, ref: 3 },
  { pattern: /\b(?:the )?(?:fourth|4th)\b/i, ref: 4 },
  { pattern: /\b(?:the )?(?:fifth|5th)\b/i, ref: 5 },
];

/** True when the buyer is asking about listing metadata, not searching or ordering. */
export function userMessageIsListingQuestion(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (!METADATA_QUESTION_PATTERN.test(trimmed)) {
    return false;
  }

  return FIELD_PATTERNS.some(({ pattern }) => pattern.test(trimmed));
}

function detectAskedFields(query: string): ListingMetadataField[] {
  const fields = FIELD_PATTERNS.filter(({ pattern }) => pattern.test(query)).map(
    ({ field }) => field,
  );

  return fields.length > 0 ? fields : ["grade"];
}

function parseListingRef(query: string): number | undefined {
  for (const { pattern, ref } of LISTING_REF_PATTERNS) {
    if (pattern.test(query)) {
      return ref;
    }
  }

  return undefined;
}

function extractCooperativeHint(query: string): string | undefined {
  const fromMatch = query.match(/\bfrom\s+([A-Za-z0-9][\w\s'-]{1,40})/i);
  if (!fromMatch?.[1]) {
    return undefined;
  }

  return fromMatch[1].trim();
}

export function resolveReferencedListings(
  conversationListings: BuyerChatPreviousListing[],
  previousListings: BuyerChatPreviousListing[],
  args: {
    cooperativeName?: string;
    crop?: string;
    listingRef?: number;
    query?: string;
  },
): BuyerChatPreviousListing[] {
  const query = args.query ?? "";
  const listingRef = args.listingRef ?? parseListingRef(query);
  const crop = args.crop ?? extractCropFromQuery(query);
  const cooperativeName =
    args.cooperativeName ?? extractCooperativeHint(query);

  if (listingRef !== undefined && listingRef >= 1) {
    const indexedSource =
      previousListings.length > 0 ? previousListings : conversationListings;
    const listing = indexedSource[listingRef - 1];
    return listing ? [listing] : [];
  }

  let candidates =
    conversationListings.length > 0 ? conversationListings : previousListings;

  if (crop) {
    candidates = candidates.filter((listing) => listing.crop === crop);
  }

  if (cooperativeName) {
    candidates = candidates.filter((listing) =>
      matchesCooperative(listing.cooperativeName, cooperativeName),
    );
  }

  return candidates;
}

function formatFieldValue(
  listing: BuyerChatPreviousListing,
  field: ListingMetadataField,
): string {
  switch (field) {
    case "grade":
      return listing.grade ?? "not specified";
    case "price":
      return `KES ${listing.pricePerKg}/kg`;
    case "quantity":
      return `${listing.quantityKg} kg in stock`;
    case "county":
      return listing.county;
    case "cooperative":
      return listing.cooperativeName;
    case "status":
      return listing.status;
    case "description":
      return "See the listing card for full details.";
    default:
      return "unknown";
  }
}

function formatFieldLabel(field: ListingMetadataField): string {
  switch (field) {
    case "grade":
      return "grade";
    case "price":
      return "price";
    case "quantity":
      return "available quantity";
    case "county":
      return "county";
    case "cooperative":
      return "cooperative";
    case "status":
      return "status";
    case "description":
      return "description";
    default:
      return field;
  }
}

function describeListing(listing: BuyerChatPreviousListing): string {
  return `${listing.crop} from ${listing.cooperativeName} (${listing.county})`;
}

function formatListingAnswer(
  listings: BuyerChatPreviousListing[],
  fields: ListingMetadataField[],
): string {
  if (listings.length === 0) {
    return "I don't have a matching listing from this conversation yet. Search for produce first, then ask about a specific result.";
  }

  if (listings.length === 1) {
    const listing = listings[0]!;
    const label = describeListing(listing);

    if (fields.length === 1) {
      const field = fields[0]!;
      const value = formatFieldValue(listing, field);
      if (field === "grade") {
        return `The ${label} is grade ${value}.`;
      }
      if (field === "price") {
        return `The ${label} is listed at ${value}.`;
      }
      if (field === "quantity") {
        return `The ${label} has ${value}.`;
      }
      if (field === "county") {
        return `The ${label} is in ${value} county.`;
      }
      if (field === "cooperative") {
        return `The ${label} is sold by ${value}.`;
      }
      return `The ${formatFieldLabel(field)} for ${label} is ${value}.`;
    }

    const details = fields
      .map((field) => `${formatFieldLabel(field)}: ${formatFieldValue(listing, field)}`)
      .join("; ");

    return `For ${label}: ${details}.`;
  }

  const field = fields[0] ?? "grade";
  const lines = listings.map((listing, index) => {
    const value = formatFieldValue(listing, field);
    const label = formatFieldLabel(field);
    return `${index + 1}. ${describeListing(listing)} — ${label}: ${value}`;
  });

  return `I found ${listings.length} matching listings:\n${lines.join("\n")}`;
}

export function tryAnswerListingQuestion(args: {
  conversationListings: BuyerChatPreviousListing[];
  previousListings: BuyerChatPreviousListing[];
  query: string;
}): string | null {
  if (!userMessageIsListingQuestion(args.query)) {
    return null;
  }

  if (
    args.conversationListings.length === 0 &&
    args.previousListings.length === 0
  ) {
    return null;
  }

  const fields = detectAskedFields(args.query);
  const crop = extractCropFromQuery(args.query);
  const cooperativeName = extractCooperativeHint(args.query);
  const listingRef = parseListingRef(args.query);

  const listings = resolveReferencedListings(
    args.conversationListings,
    args.previousListings,
    {
      cooperativeName,
      crop,
      listingRef,
      query: args.query,
    },
  );

  return formatListingAnswer(listings, fields);
}

export function answerAboutListingsFromTool(args: {
  conversationListings: BuyerChatPreviousListing[];
  cooperativeName?: string;
  crop?: string;
  fields?: ListingMetadataField[];
  listingRef?: number;
  previousListings: BuyerChatPreviousListing[];
}): string {
  const fields =
    args.fields && args.fields.length > 0 ? args.fields : (["grade"] as const);

  const listings = resolveReferencedListings(
    args.conversationListings,
    args.previousListings,
    {
      cooperativeName: args.cooperativeName,
      crop: args.crop,
      listingRef: args.listingRef,
    },
  );

  return formatListingAnswer(listings, [...fields]);
}
