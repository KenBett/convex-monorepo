import {
  LISTING_CERTIFICATION_LABELS,
  LISTING_PACKAGING_LABELS,
  LISTING_TAG_LABELS,
  isListingCertification,
  isListingPackaging,
  isListingTag,
  stripInternalListingMarkers,
  type ListingCertification,
  type ListingTag,
} from "@repo/types";

import { matchesCooperative } from "../lib/listings";
import type { BuyerChatPreviousListing } from "./buyerOrderResolve";
import { extractCropFromQuery } from "./buyerSearchIntentNormalize";

export type ListingMetadataField =
  | "certifications"
  | "cooperative"
  | "county"
  | "description"
  | "grade"
  | "harvest"
  | "packaging"
  | "price"
  | "quantity"
  | "status"
  | "tags"
  | "variety";

/** Full listing summary — used for "tell me about / details / everything". */
export const ALL_LISTING_METADATA_FIELDS: ListingMetadataField[] = [
  "grade",
  "price",
  "quantity",
  "county",
  "cooperative",
  "status",
  "description",
  "tags",
  "certifications",
  "packaging",
  "variety",
  "harvest",
];

const METADATA_QUESTION_PATTERN =
  /\?(?:\s|$)|^\s*is\s+(?:this|it|that)\b|\b(what|which|how much|how many|tell me|who|where|is (?:this|it|that)|does (?:this|it|that)|has (?:this|it|that)|was (?:this|it|that))\b/i;

/** Broad asks that mean "summarize this listing", not the free-text description alone. */
const OVERVIEW_PATTERN =
  /\b(about|details?|tell me|everything|info(?:rmation)?|overview|summar(?:y|ise|ize))\b/i;

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
  // Only the word "description" — "about" / "details" are overview asks.
  { field: "description", pattern: /\bdescription\b/i },
  {
    field: "tags",
    pattern:
      /\b(tags?|export[-\s]?(?:grade|quality)|organic|pesticide[-\s]?free|washed|sorted|cold[-\s]?chain|traceable)\b/i,
  },
  {
    field: "certifications",
    pattern:
      /\b(certifications?|certified|kepsa|global\s*g\.?a\.?p\.?|fairtrade)\b/i,
  },
  {
    field: "packaging",
    pattern: /\b(packaging|packed as|gunny bags?|crates?)\b|\bbulk\b/i,
  },
  { field: "variety", pattern: /\bvariety\b/i },
  {
    field: "harvest",
    pattern: /\b(harvest|when(?:'s| is)? (?:it )?ready|availability)\b/i,
  },
];

type AttributeCheck =
  | {
      kind: "tag";
      key: ListingTag;
      label: string;
      pattern: RegExp;
    }
  | {
      kind: "certification";
      key: ListingCertification;
      label: string;
      pattern: RegExp;
    };

/** Yes/no attribute checks mapped from natural buyer phrasing. */
const ATTRIBUTE_CHECKS: AttributeCheck[] = [
  {
    kind: "tag",
    key: "export_grade",
    label: "Export grade",
    pattern: /\bexport[-\s]?(?:grade|quality)\b/i,
  },
  {
    kind: "tag",
    key: "organic",
    label: "Organic",
    pattern: /\borganic\b/i,
  },
  {
    kind: "tag",
    key: "pesticide_free",
    label: "Pesticide-free",
    pattern: /\bpesticide[-\s]?free\b/i,
  },
  {
    kind: "tag",
    key: "washed",
    label: "Washed",
    pattern: /\bwashed\b/i,
  },
  {
    kind: "tag",
    key: "sorted",
    label: "Sorted",
    pattern: /\bsorted\b/i,
  },
  {
    kind: "tag",
    key: "cold_chain",
    label: "Cold chain",
    pattern: /\bcold[-\s]?chain\b/i,
  },
  {
    kind: "tag",
    key: "traceable",
    label: "Traceable",
    pattern: /\btraceable\b/i,
  },
  {
    kind: "certification",
    key: "kepsa",
    label: "KEPSA",
    pattern: /\bkepsa\b/i,
  },
  {
    kind: "certification",
    key: "globalgap",
    label: "GlobalG.A.P.",
    pattern: /\bglobal\s*g\.?a\.?p\.?\b/i,
  },
  {
    kind: "certification",
    key: "fairtrade",
    label: "Fairtrade",
    pattern: /\bfair\s*-?\s*trade\b/i,
  },
  {
    kind: "certification",
    key: "organic_certified",
    label: "Organic certified",
    pattern: /\borganic[-\s]?certified\b/i,
  },
];

const YES_NO_ATTRIBUTE_PATTERN =
  /\b(?:is|does|has|was)\s+(?:this|it|that)\b|\btell me if\b|\bis it\b/i;

const LISTING_REF_PATTERNS: Array<{ pattern: RegExp; ref: number }> = [
  { pattern: /\b(?:the )?(?:first|1st)\b/i, ref: 1 },
  { pattern: /\b(?:the )?(?:second|2nd)\b/i, ref: 2 },
  { pattern: /\b(?:the )?(?:third|3rd)\b/i, ref: 3 },
  { pattern: /\b(?:the )?(?:fourth|4th)\b/i, ref: 4 },
  { pattern: /\b(?:the )?(?:fifth|5th)\b/i, ref: 5 },
];

/**
 * Matches singular demonstrative pronouns ("this one", "that one", "this", "that", "it")
 * that refer to the most recently shown single listing rather than an ordinal position.
 */
const SINGULAR_PRONOUN_PATTERN =
  /\b(?:this|that)(?:\s+one)?\b|\bit\b/i;

function detectAttributeCheck(query: string): AttributeCheck | null {
  // Only yes/no phrasing ("is this export quality?") — open asks like
  // "what standards does it have?" use the tags/certifications field path.
  if (!YES_NO_ATTRIBUTE_PATTERN.test(query)) {
    return null;
  }

  for (const check of ATTRIBUTE_CHECKS) {
    if (check.pattern.test(query)) {
      return check;
    }
  }
  return null;
}

function listingHasAttribute(
  listing: BuyerChatPreviousListing,
  check: AttributeCheck,
): boolean {
  if (check.kind === "tag") {
    return (listing.tags ?? []).includes(check.key);
  }
  return (listing.certifications ?? []).includes(check.key);
}

function formatAttributeCheckAnswer(
  listings: BuyerChatPreviousListing[],
  check: AttributeCheck,
): string {
  if (listings.length === 0) {
    return "I don't have a matching listing from this conversation yet. Search for produce first, then ask about a specific result.";
  }

  if (listings.length === 1) {
    const listing = listings[0]!;
    const label = describeListing(listing);
    if (listingHasAttribute(listing, check)) {
      return `Yes — the ${label} was listed as ${check.label}.`;
    }
    return `No — the ${label} is not listed as ${check.label}.`;
  }

  const lines = listings.map((listing, index) => {
    const present = listingHasAttribute(listing, check);
    return `${index + 1}. ${describeListing(listing)} — ${present ? `yes, listed as ${check.label}` : `not listed as ${check.label}`}`;
  });

  return `Here's what I see for ${check.label}:\n${lines.join("\n")}`;
}

function formatTagLabels(tags: BuyerChatPreviousListing["tags"]): string {
  if (!tags || tags.length === 0) {
    return "none listed";
  }
  return tags
    .map((tag) => (isListingTag(tag) ? LISTING_TAG_LABELS[tag] : tag))
    .join(", ");
}

function formatCertificationLabels(
  certifications: BuyerChatPreviousListing["certifications"],
): string {
  if (!certifications || certifications.length === 0) {
    return "none listed";
  }
  return certifications
    .map((cert) =>
      isListingCertification(cert) ? LISTING_CERTIFICATION_LABELS[cert] : cert,
    )
    .join(", ");
}

function formatPackagingLabel(
  packaging: BuyerChatPreviousListing["packaging"],
): string {
  if (!packaging) {
    return "not specified";
  }
  return isListingPackaging(packaging)
    ? LISTING_PACKAGING_LABELS[packaging]
    : packaging;
}

function formatStandardsSummary(listing: BuyerChatPreviousListing): string {
  const parts: string[] = [];
  const tags = formatTagLabels(listing.tags);
  const certs = formatCertificationLabels(listing.certifications);
  if (tags !== "none listed") {
    parts.push(tags);
  }
  if (certs !== "none listed") {
    parts.push(certs);
  }
  return parts.length > 0 ? parts.join(", ") : "none listed";
}

/** True when the buyer is asking about listing metadata, not searching or ordering. */
export function userMessageIsListingQuestion(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (!METADATA_QUESTION_PATTERN.test(trimmed)) {
    return false;
  }

  return (
    OVERVIEW_PATTERN.test(trimmed) ||
    /\bstandards?\b/i.test(trimmed) ||
    FIELD_PATTERNS.some(({ pattern }) => pattern.test(trimmed)) ||
    ATTRIBUTE_CHECKS.some(({ pattern }) => pattern.test(trimmed))
  );
}

function detectAskedFields(query: string): ListingMetadataField[] {
  const fields = FIELD_PATTERNS.filter(({ pattern }) => pattern.test(query)).map(
    ({ field }) => field,
  );

  // Card "Standards" row combines certifications + tags.
  if (/\bstandards?\b/i.test(query)) {
    if (!fields.includes("certifications")) {
      fields.push("certifications");
    }
    if (!fields.includes("tags")) {
      fields.push("tags");
    }
  }

  if (fields.length > 0) {
    return fields;
  }

  // "what can you tell me about this maize" → full summary, not description-only.
  if (OVERVIEW_PATTERN.test(query)) {
    return [...ALL_LISTING_METADATA_FIELDS];
  }

  return ["grade"];
}

function isFullOverview(fields: ListingMetadataField[]): boolean {
  return (
    fields.length === ALL_LISTING_METADATA_FIELDS.length &&
    ALL_LISTING_METADATA_FIELDS.every((field) => fields.includes(field))
  );
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

function findListingById(
  listings: BuyerChatPreviousListing[],
  listingId: string,
): BuyerChatPreviousListing | undefined {
  return listings.find((listing) => listing.listingId === listingId);
}

/** Move the focused carousel card to index 0 so "the first" / default refs hit it. */
export function promoteFocusedListing<T extends { listingId: string }>(
  listings: T[],
  focusedListingId?: string,
): T[] {
  if (!focusedListingId || listings.length === 0) {
    return listings;
  }

  const index = listings.findIndex(
    (listing) => listing.listingId === focusedListingId,
  );
  if (index <= 0) {
    return listings;
  }

  const focused = listings[index]!;
  return [focused, ...listings.slice(0, index), ...listings.slice(index + 1)];
}

export function resolveReferencedListings(
  conversationListings: BuyerChatPreviousListing[],
  previousListings: BuyerChatPreviousListing[],
  args: {
    cooperativeName?: string;
    crop?: string;
    focusedListingId?: string;
    listingRef?: number;
    query?: string;
  },
): BuyerChatPreviousListing[] {
  const query = args.query ?? "";
  const listingRef = args.listingRef ?? parseListingRef(query);
  const crop = args.crop ?? extractCropFromQuery(query);
  const cooperativeName =
    args.cooperativeName ?? extractCooperativeHint(query);
  const focusedListing =
    args.focusedListingId !== undefined
      ? (findListingById(previousListings, args.focusedListingId) ??
        findListingById(conversationListings, args.focusedListingId))
      : undefined;

  if (listingRef !== undefined && listingRef >= 1) {
    const indexedSource = promoteFocusedListing(
      previousListings.length > 0 ? previousListings : conversationListings,
      args.focusedListingId,
    );
    const listing = indexedSource[listingRef - 1];
    return listing ? [listing] : [];
  }

  // Centered carousel card wins for "this / that / it" and bare follow-ups.
  const hasSingularPronoun =
    listingRef === undefined && SINGULAR_PRONOUN_PATTERN.test(query);
  if (focusedListing) {
    const cropOk = !crop || focusedListing.crop === crop;
    const coopOk =
      !cooperativeName ||
      matchesCooperative(focusedListing.cooperativeName, cooperativeName);
    if (cropOk && coopOk && (hasSingularPronoun || (!crop && !cooperativeName))) {
      return [focusedListing];
    }
  }

  // "this one / that one / it" — singular means the focused or first shown card,
  // not every listing in the last result set.
  let candidates = hasSingularPronoun
    ? (previousListings.length > 0
        ? previousListings.slice(0, 1)
        : conversationListings.slice(0, 1))
    : conversationListings.length > 0
      ? conversationListings
      : previousListings;

  if (crop) {
    candidates = candidates.filter((listing) => listing.crop === crop);
  }

  if (cooperativeName) {
    candidates = candidates.filter((listing) =>
      matchesCooperative(listing.cooperativeName, cooperativeName),
    );
  }

  if (focusedListing && candidates.some((listing) => listing.listingId === focusedListing.listingId)) {
    return promoteFocusedListing(candidates, focusedListing.listingId);
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
    case "description": {
      const cleaned = listing.description
        ? stripInternalListingMarkers(listing.description)
        : "";
      return cleaned.length > 0 ? cleaned : "No description available.";
    }
    case "tags":
      return formatTagLabels(listing.tags);
    case "certifications":
      return formatCertificationLabels(listing.certifications);
    case "packaging":
      return formatPackagingLabel(listing.packaging);
    case "variety":
      return listing.variety?.trim() || "not specified";
    case "harvest":
      return listing.harvestWindowLabel?.trim() || "not specified";
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
    case "tags":
      return "standards/tags";
    case "certifications":
      return "certifications";
    case "packaging":
      return "packaging";
    case "variety":
      return "variety";
    case "harvest":
      return "harvest window";
    default:
      return field;
  }
}

function describeListing(listing: BuyerChatPreviousListing): string {
  return `${listing.crop} from ${listing.cooperativeName} (${listing.county})`;
}

function formatListingOverview(listing: BuyerChatPreviousListing): string {
  const grade = listing.grade?.trim();
  const gradePart = grade
    ? /^grade\b/i.test(grade)
      ? grade
      : `Grade ${grade}`
    : "Grade not specified";
  const description = listing.description
    ? stripInternalListingMarkers(listing.description)
    : "";
  const notesPart = description.length > 0 ? ` Seller notes: ${description}` : "";
  const standards = formatStandardsSummary(listing);
  const standardsPart =
    standards !== "none listed" ? ` Standards: ${standards}.` : "";
  const packaging = formatPackagingLabel(listing.packaging);
  const packagingPart =
    packaging !== "not specified" ? ` Packaging: ${packaging}.` : "";
  const variety = listing.variety?.trim();
  const varietyPart = variety ? ` Variety: ${variety}.` : "";
  const harvest = listing.harvestWindowLabel?.trim();
  const harvestPart = harvest ? ` Harvest: ${harvest}.` : "";

  return (
    `This ${listing.crop} is from ${listing.cooperativeName} in ${listing.county} County. ` +
    `${gradePart}, listed at KES ${listing.pricePerKg}/kg with ${listing.quantityKg} kg in stock ` +
    `(status: ${listing.status}).${standardsPart}${packagingPart}${varietyPart}${harvestPart}${notesPart}`
  );
}

function formatListingAnswer(
  listings: BuyerChatPreviousListing[],
  fields: ListingMetadataField[],
): string {
  if (listings.length === 0) {
    return "I don't have a matching listing from this conversation yet. Search for produce first, then ask about a specific result.";
  }

  if (isFullOverview(fields)) {
    if (listings.length === 1) {
      return formatListingOverview(listings[0]!);
    }

    const lines = listings.map((listing, index) => {
      return `${index + 1}. ${formatListingOverview(listing)}`;
    });
    return `I found ${listings.length} matching listings:\n${lines.join("\n")}`;
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
      if (field === "description") {
        return `The seller notes for the ${label}: ${value}`;
      }
      if (field === "tags") {
        return `Standards/tags for the ${label}: ${value}.`;
      }
      if (field === "certifications") {
        return `Certifications for the ${label}: ${value}.`;
      }
      if (field === "packaging") {
        return `The ${label} is packed as ${value}.`;
      }
      if (field === "variety") {
        return `The variety for the ${label} is ${value}.`;
      }
      if (field === "harvest") {
        return `Harvest window for the ${label}: ${value}.`;
      }
      return `The ${formatFieldLabel(field)} for ${label} is ${value}.`;
    }

    // "what standards…" → one combined line matching the card Standards row.
    if (
      fields.length === 2 &&
      fields.includes("tags") &&
      fields.includes("certifications")
    ) {
      return `Standards for the ${label}: ${formatStandardsSummary(listing)}.`;
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
  focusedListingId?: string;
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

  const crop = extractCropFromQuery(args.query);
  const cooperativeName = extractCooperativeHint(args.query);
  const listingRef = parseListingRef(args.query);

  const listings = resolveReferencedListings(
    args.conversationListings,
    args.previousListings,
    {
      cooperativeName,
      crop,
      focusedListingId: args.focusedListingId,
      listingRef,
      query: args.query,
    },
  );

  const attributeCheck = detectAttributeCheck(args.query);
  if (attributeCheck) {
    return formatAttributeCheckAnswer(listings, attributeCheck);
  }

  const fields = detectAskedFields(args.query);
  return formatListingAnswer(listings, fields);
}

export function answerAboutListingsFromTool(args: {
  conversationListings: BuyerChatPreviousListing[];
  cooperativeName?: string;
  crop?: string;
  fields?: ListingMetadataField[];
  focusedListingId?: string;
  listingRef?: number;
  previousListings: BuyerChatPreviousListing[];
}): string {
  // Omit fields → full overview (price, grade, stock, location, seller, status, notes).
  const fields =
    args.fields && args.fields.length > 0
      ? args.fields
      : [...ALL_LISTING_METADATA_FIELDS];

  const listings = resolveReferencedListings(
    args.conversationListings,
    args.previousListings,
    {
      cooperativeName: args.cooperativeName,
      crop: args.crop,
      focusedListingId: args.focusedListingId,
      listingRef: args.listingRef,
    },
  );

  return formatListingAnswer(listings, fields);
}
