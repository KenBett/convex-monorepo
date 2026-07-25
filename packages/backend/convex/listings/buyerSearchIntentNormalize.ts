import {
  COUNTIES,
  CROP_TYPES,
  LISTING_CERTIFICATIONS,
  LISTING_CERTIFICATION_LABELS,
  LISTING_HARD_FILTER_TAGS,
  LISTING_PACKAGING,
  LISTING_PACKAGING_LABELS,
  LISTING_TAG_LABELS,
  type County,
  type CropType,
  type ListingCertification,
  type ListingHardFilterTag,
  type ListingPackaging,
} from "@repo/types";

import { assertValidCounty, assertValidCrop } from "../lib/listings";
import {
  assertValidHardFilterTags,
  assertValidSearchCertifications,
  assertValidSearchPackaging,
} from "../lib/listingAttributes";
import {
  toBuyerSearchIntent,
  type ParsedBuyerSearchIntent,
} from "./buyerSearchIntentParse";
import type { BuyerSearchIntent } from "./buyerChatParse";

export type BuyerSearchIntentPreviousContext = {
  crops: string[];
  intent: {
    certifications?: ListingCertification[];
    county?: string;
    crop?: string;
    grade?: string;
    maxPricePerKg?: number;
    minQuantityKg?: number;
    packaging?: ListingPackaging;
    tags?: ListingHardFilterTag[];
  };
  listingCount: number;
};

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

function coerceCounty(county: string): County {
  assertValidCounty(county);
  return county as County;
}

/** Singular / colloquial forms → canonical CROP_TYPES value. */
const CROP_ALIASES: Record<string, CropType> = {
  avocado: "avocado",
  avocados: "avocado",
  banana: "bananas",
  bananas: "bananas",
  bean: "beans",
  beans: "beans",
  cabbage: "cabbage",
  cabbages: "cabbage",
  coffee: "coffee",
  corn: "maize",
  maize: "maize",
  matoke: "bananas",
  onion: "onions",
  onions: "onions",
  plantain: "bananas",
  plantains: "bananas",
  potato: "potatoes",
  potatoe: "potatoes",
  potatoes: "potatoes",
  potatos: "potatoes",
  tea: "tea",
  tomato: "tomatoes",
  tomatoes: "tomatoes",
  wheat: "wheat",
};

function levenshteinDistance(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  if (left.length === 0) {
    return right.length;
  }
  if (right.length === 0) {
    return left.length;
  }

  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );

  for (let row = 0; row < rows; row += 1) {
    matrix[row]![0] = row;
  }
  for (let col = 0; col < cols; col += 1) {
    matrix[0]![col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row]![col] = Math.min(
        matrix[row - 1]![col]! + 1,
        matrix[row]![col - 1]! + 1,
        matrix[row - 1]![col - 1]! + cost,
      );
    }
  }

  return matrix[left.length]![right.length]!;
}

function maxCropEditDistance(tokenLength: number): number {
  if (tokenLength <= 4) {
    return 0;
  }
  if (tokenLength <= 7) {
    return 1;
  }
  return 2;
}

function resolveCropAlias(token: string): CropType | undefined {
  return CROP_ALIASES[token];
}

/**
 * English function words that collide with crop prefixes (to→tomatoes, on→onions).
 * Only treat these as crop prefixes when they are the first token ("to nakuru").
 */
const CROP_PREFIX_STOPWORDS = new Set([
  "an",
  "as",
  "at",
  "be",
  "in",
  "of",
  "on",
  "or",
  "to",
]);

/**
 * Fast typing shortcuts: "to" → tomatoes, "po" → potatoes, "ma" → maize, "av" → avocado.
 * Only returns a crop when the prefix uniquely identifies one (preferring canonical names
 * so "ma" → maize, not matoke/bananas).
 */
function prefixMatchCropToken(token: string): CropType | undefined {
  if (token.length < 2) {
    return undefined;
  }

  const canonicalMatches = new Set<CropType>();
  for (const crop of CROP_TYPES) {
    if (crop.startsWith(token)) {
      canonicalMatches.add(crop);
    }
  }
  if (canonicalMatches.size === 1) {
    return [...canonicalMatches][0];
  }
  if (canonicalMatches.size > 1) {
    return undefined;
  }

  const aliasMatches = new Set<CropType>();
  for (const [alias, crop] of Object.entries(CROP_ALIASES)) {
    if (alias.startsWith(token)) {
      aliasMatches.add(crop);
    }
  }
  if (aliasMatches.size === 1) {
    return [...aliasMatches][0];
  }

  return undefined;
}

function fuzzyMatchCropToken(token: string): CropType | undefined {
  const exact = resolveCropAlias(token);
  if (exact) {
    return exact;
  }

  if (token.length < 5) {
    return undefined;
  }

  let bestCrop: CropType | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [alias, crop] of Object.entries(CROP_ALIASES)) {
    if (Math.abs(alias.length - token.length) > 2) {
      continue;
    }

    const distance = levenshteinDistance(token, alias);
    const allowed = maxCropEditDistance(Math.min(token.length, alias.length));
    if (distance > allowed || distance >= bestDistance) {
      continue;
    }

    bestCrop = crop;
    bestDistance = distance;
  }

  return bestCrop;
}

/** Detect an explicit crop in the buyer's raw message (overrides stale chat context). */
export function extractCropFromQuery(query: string): CropType | undefined {
  const normalized = query.toLowerCase();

  if (/\bcorn\b/.test(normalized)) {
    return "maize";
  }

  if (/\b(plantain|cooking\s+bananas?|matoke)\b/.test(normalized)) {
    return "bananas";
  }

  for (const crop of CROP_TYPES) {
    const pattern = new RegExp(`\\b${crop}\\b`, "i");
    if (pattern.test(query)) {
      return crop;
    }
  }

  // Singular / alias exact tokens (potato → potatoes).
  const tokens = normalized.match(/[a-z]+/g) ?? [];
  for (const token of tokens) {
    const aliasCrop = resolveCropAlias(token);
    if (aliasCrop) {
      return aliasCrop;
    }
  }

  // Prefix shortcuts while typing: "to" → tomatoes, "po" → potatoes.
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (CROP_PREFIX_STOPWORDS.has(token) && index !== 0) {
      continue;
    }
    const prefixCrop = prefixMatchCropToken(token);
    if (prefixCrop) {
      return prefixCrop;
    }
  }

  // Typo tolerance: "potoatoes" → potatoes, "tomatows" → tomatoes.
  for (const token of tokens) {
    const fuzzyCrop = fuzzyMatchCropToken(token);
    if (fuzzyCrop) {
      return fuzzyCrop;
    }
  }

  return undefined;
}

/** Detect an explicit Kenyan county mentioned in the buyer's message. */
export function extractCountyFromQuery(query: string): County | undefined {
  // Longer names first so "Uasin Gishu" wins over a hypothetical shorter prefix.
  const countiesByLength = [...COUNTIES].sort(
    (left, right) => right.length - left.length,
  );

  for (const county of countiesByLength) {
    const escaped = county.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");
    if (pattern.test(query)) {
      return county;
    }
  }

  return undefined;
}

/** Detect a grade phrase like "grade 2", "Grade A", "Premium", or "Standard". */
export function extractGradeFromQuery(query: string): string | undefined {
  const named = query.match(/\b(premium|standard)\b/i);
  if (named?.[1]) {
    const value = named[1].toLowerCase();
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  const match = query.match(/\bgrade\s*(\d+|[a-z])\b/i);
  if (!match?.[1]) {
    return undefined;
  }

  return match[1];
}

function applyQueryCropOverride(
  intent: BuyerSearchIntent,
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent {
  const cropFromQuery = extractCropFromQuery(query);
  if (!cropFromQuery) {
    return intent;
  }

  const nextIntent: BuyerSearchIntent = {
    ...intent,
    crop: cropFromQuery,
  };

  const isNewCropSearch =
    !previousContext ||
    previousContext.crops.length === 0 ||
    !previousContext.crops.includes(cropFromQuery);

  if (isNewCropSearch) {
    nextIntent.refinePreviousResults = false;
  }

  return nextIntent;
}

function applyQueryCountyOverride(
  intent: BuyerSearchIntent,
  query: string,
): BuyerSearchIntent {
  const countyFromQuery = extractCountyFromQuery(query);
  if (!countyFromQuery) {
    return intent;
  }

  return {
    ...intent,
    county: countyFromQuery,
  };
}

/**
 * Detect Quality/Standards tags (organic, cold chain, washed, …) in the buyer's message.
 * Skips bare "organic" when the buyer asked for "organic certified" (certification instead).
 */
export function extractHardFilterTagsFromQuery(
  query: string,
): ListingHardFilterTag[] {
  const normalized = query.toLowerCase();
  const asksOrganicCertified =
    /\borganic\s+certified\b/i.test(query) ||
    normalized.includes("organic_certified");
  const found: ListingHardFilterTag[] = [];

  // Longer / multi-word labels first so "export grade" wins cleanly.
  const tagsByLabelLength = [...LISTING_HARD_FILTER_TAGS].sort(
    (left, right) =>
      LISTING_TAG_LABELS[right].length - LISTING_TAG_LABELS[left].length,
  );

  for (const tag of tagsByLabelLength) {
    if (tag === "organic" && asksOrganicCertified) {
      continue;
    }

    const label = LISTING_TAG_LABELS[tag].toLowerCase();
    const slug = tag.replaceAll("_", " ");
    const labelPattern = new RegExp(
      `\\b${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`,
      "i",
    );
    const slugPattern = new RegExp(
      `\\b${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`,
      "i",
    );

    if (
      labelPattern.test(query) ||
      slugPattern.test(query) ||
      normalized.includes(tag)
    ) {
      found.push(tag);
    }
  }

  return found;
}

function applyQueryTagOverride(
  intent: BuyerSearchIntent,
  query: string,
): BuyerSearchIntent {
  const tagsFromQuery = extractHardFilterTagsFromQuery(query);
  if (tagsFromQuery.length === 0) {
    return intent;
  }

  const merged = Array.from(
    new Set([...(intent.tags ?? []), ...tagsFromQuery]),
  );
  return {
    ...intent,
    tags: assertValidHardFilterTags(merged),
  };
}

/** Detect certifications (KEPSA, GlobalG.A.P., Fairtrade, organic certified). */
export function extractCertificationsFromQuery(
  query: string,
): ListingCertification[] {
  const normalized = query.toLowerCase();
  const found: ListingCertification[] = [];

  const certsByLabelLength = [...LISTING_CERTIFICATIONS].sort(
    (left, right) =>
      LISTING_CERTIFICATION_LABELS[right].length -
      LISTING_CERTIFICATION_LABELS[left].length,
  );

  for (const certification of certsByLabelLength) {
    const label = LISTING_CERTIFICATION_LABELS[certification].toLowerCase();
    const slug = certification.replaceAll("_", " ");
    const compactLabel = label.replace(/[.\s]+/g, "");
    const compactQuery = normalized.replace(/[.\s]+/g, "");

    if (
      normalized.includes(label) ||
      normalized.includes(slug) ||
      normalized.includes(certification) ||
      (compactLabel.length >= 4 && compactQuery.includes(compactLabel))
    ) {
      found.push(certification);
    }
  }

  return found;
}

function applyQueryCertificationOverride(
  intent: BuyerSearchIntent,
  query: string,
): BuyerSearchIntent {
  const certificationsFromQuery = extractCertificationsFromQuery(query);
  if (certificationsFromQuery.length === 0) {
    return intent;
  }

  const merged = Array.from(
    new Set([...(intent.certifications ?? []), ...certificationsFromQuery]),
  );
  return {
    ...intent,
    certifications: assertValidSearchCertifications(merged),
  };
}

/** Detect packaging type (crates, gunny bags, bulk, bags). */
export function extractPackagingFromQuery(
  query: string,
): ListingPackaging | undefined {
  const normalized = query.toLowerCase();

  const packagingsByLabelLength = [...LISTING_PACKAGING].sort(
    (left, right) =>
      LISTING_PACKAGING_LABELS[right].length -
      LISTING_PACKAGING_LABELS[left].length,
  );

  for (const packaging of packagingsByLabelLength) {
    if (packaging === "bulk") {
      // "bulk ready" is a standards tag, not packaging=bulk.
      const withoutBulkReady = normalized
        .replace(/\bbulk\s+ready\b/g, " ")
        .replace(/bulk_ready/g, " ");
      if (!/\bbulk\b/.test(withoutBulkReady)) {
        continue;
      }
    }

    const label = LISTING_PACKAGING_LABELS[packaging].toLowerCase();
    const slug = packaging.replaceAll("_", " ");
    const labelPattern = new RegExp(
      `\\b${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`,
      "i",
    );
    const slugPattern = new RegExp(
      `\\b${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`,
      "i",
    );

    if (labelPattern.test(query) || slugPattern.test(query)) {
      return packaging;
    }
  }

  return undefined;
}

function applyQueryPackagingOverride(
  intent: BuyerSearchIntent,
  query: string,
): BuyerSearchIntent {
  if (intent.packaging) {
    return intent;
  }

  const packagingFromQuery = extractPackagingFromQuery(query);
  if (!packagingFromQuery) {
    return intent;
  }

  return {
    ...intent,
    packaging: packagingFromQuery,
  };
}

function applyQueryGradeOverride(
  intent: BuyerSearchIntent,
  query: string,
): BuyerSearchIntent {
  if (intent.grade) {
    return intent;
  }

  const gradeFromQuery = extractGradeFromQuery(query);
  if (!gradeFromQuery) {
    return intent;
  }

  return {
    ...intent,
    grade: gradeFromQuery,
  };
}

/**
 * True when the buyer wants additional cards beyond what was already shown —
 * not a re-rank of the same set ("cheaper one"), and not a brand-new crop pivot.
 */
export function messageHasExpandResultsIntent(query: string): boolean {
  const normalized = query.trim();
  if (normalized.length === 0) {
    return false;
  }

  if (
    /\b((show|give|find|get|list|display)\s+(me\s+)?(the\s+)?(rest|more|others|another))\b/i.test(
      normalized,
    ) ||
    /\b(any\s+more|what\s+else|other\s+(options|listings|results)|the\s+rest\s+of)\b/i.test(
      normalized,
    )
  ) {
    return true;
  }

  // "more potatoes" / "other maize" — same crop thread, ask for additional cards
  if (
    extractCropFromQuery(normalized) !== undefined &&
    /\b(more|rest|other|others|another)\b/i.test(normalized) &&
    !/\b(more\s+expensive|less\s+expensive|more\s+affordable)\b/i.test(
      normalized,
    )
  ) {
    return true;
  }

  return false;
}

function isFreshCropThread(
  crop: string | undefined,
  previousContext?: BuyerSearchIntentPreviousContext,
): boolean {
  if (!crop || !previousContext || previousContext.crops.length === 0) {
    return false;
  }

  return !previousContext.crops.includes(crop);
}

function inheritPreviousIntent(
  intent: BuyerSearchIntent,
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent {
  if (!previousContext) {
    return intent;
  }

  const cropFromQuery = extractCropFromQuery(query);
  const nextIntent = { ...intent };
  const turnCrop = nextIntent.crop ?? cropFromQuery;

  // Switching crop (maize → onions) starts a fresh search thread: keep the new
  // crop, drop stale county/grade/price filters unless the buyer restated them.
  if (isFreshCropThread(turnCrop, previousContext)) {
    nextIntent.refinePreviousResults = false;
    if (!nextIntent.crop && turnCrop) {
      nextIntent.crop = coerceCrop(turnCrop);
    }
    if (!extractCountyFromQuery(query)) {
      delete nextIntent.county;
    }
    if (!extractGradeFromQuery(query)) {
      delete nextIntent.grade;
    }
    if (!/\b\d+(\.\d+)?\s*(?:kg|kilos?|kgs?)\b/i.test(query)) {
      delete nextIntent.minQuantityKg;
    }
    if (
      !/\b(?:under|below|max|at\s+most|cheaper\s+than)\b/i.test(query) &&
      !/\b(?:kes|ksh)\s*\d+/i.test(query)
    ) {
      delete nextIntent.maxPricePerKg;
    }
    if (extractHardFilterTagsFromQuery(query).length === 0) {
      delete nextIntent.tags;
    }
    if (extractCertificationsFromQuery(query).length === 0) {
      delete nextIntent.certifications;
    }
    if (!extractPackagingFromQuery(query)) {
      delete nextIntent.packaging;
    }
    delete nextIntent.excludePreviousListings;
    return nextIntent;
  }

  if (!nextIntent.crop && !cropFromQuery && previousContext.intent.crop) {
    nextIntent.crop = coerceCrop(previousContext.intent.crop);
  }
  if (!nextIntent.county && previousContext.intent.county) {
    nextIntent.county = coerceCounty(previousContext.intent.county);
  }
  if (
    !nextIntent.grade &&
    nextIntent.refinePreviousResults &&
    previousContext.intent.grade
  ) {
    nextIntent.grade = previousContext.intent.grade;
  }
  if (!nextIntent.minQuantityKg && previousContext.intent.minQuantityKg) {
    nextIntent.minQuantityKg = previousContext.intent.minQuantityKg;
  }
  if (!nextIntent.maxPricePerKg && previousContext.intent.maxPricePerKg) {
    nextIntent.maxPricePerKg = previousContext.intent.maxPricePerKg;
  }
  if (
    nextIntent.refinePreviousResults &&
    !nextIntent.tags &&
    previousContext.intent.tags &&
    previousContext.intent.tags.length > 0
  ) {
    nextIntent.tags = previousContext.intent.tags;
  }
  if (
    nextIntent.refinePreviousResults &&
    !nextIntent.certifications &&
    previousContext.intent.certifications &&
    previousContext.intent.certifications.length > 0
  ) {
    nextIntent.certifications = previousContext.intent.certifications;
  }
  if (
    nextIntent.refinePreviousResults &&
    !nextIntent.packaging &&
    previousContext.intent.packaging
  ) {
    nextIntent.packaging = previousContext.intent.packaging;
  }

  if (
    nextIntent.refinePreviousResults &&
    !nextIntent.crop &&
    previousContext.crops[0]
  ) {
    nextIntent.crop = coerceCrop(previousContext.crops[0]);
  }

  if (
    nextIntent.refinePreviousResults &&
    nextIntent.crop &&
    previousContext.crops.length > 0 &&
    !previousContext.crops.includes(nextIntent.crop)
  ) {
    nextIntent.refinePreviousResults = false;
  }

  return nextIntent;
}

/**
 * "Show me the rest / more" keeps the same crop thread filters but runs a fresh
 * inventory search and drops cards already shown.
 */
function applyExpandResultsOverride(
  intent: BuyerSearchIntent,
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent {
  if (!messageHasExpandResultsIntent(query)) {
    return intent;
  }

  const nextIntent: BuyerSearchIntent = {
    ...intent,
    excludePreviousListings: true,
    refinePreviousResults: false,
  };
  delete nextIntent.resultLimit;

  if (previousContext?.intent.crop && !nextIntent.crop) {
    nextIntent.crop = coerceCrop(previousContext.intent.crop);
  }
  if (previousContext?.intent.county && !nextIntent.county) {
    nextIntent.county = coerceCounty(previousContext.intent.county);
  }
  if (previousContext?.intent.grade && !nextIntent.grade) {
    nextIntent.grade = previousContext.intent.grade;
  }
  if (
    previousContext?.intent.minQuantityKg &&
    !nextIntent.minQuantityKg
  ) {
    nextIntent.minQuantityKg = previousContext.intent.minQuantityKg;
  }
  if (
    previousContext?.intent.maxPricePerKg &&
    !nextIntent.maxPricePerKg
  ) {
    nextIntent.maxPricePerKg = previousContext.intent.maxPricePerKg;
  }
  if (
    previousContext?.intent.tags &&
    previousContext.intent.tags.length > 0 &&
    !nextIntent.tags
  ) {
    nextIntent.tags = previousContext.intent.tags;
  }
  if (
    previousContext?.intent.certifications &&
    previousContext.intent.certifications.length > 0 &&
    !nextIntent.certifications
  ) {
    nextIntent.certifications = previousContext.intent.certifications;
  }
  if (previousContext?.intent.packaging && !nextIntent.packaging) {
    nextIntent.packaging = previousContext.intent.packaging;
  }

  return nextIntent;
}

/** Normalize orchestrator or parser output into a validated BuyerSearchIntent. */
export function normalizeBuyerSearchIntent(
  parsed: ParsedBuyerSearchIntent,
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent {
  let intent = toBuyerSearchIntent(parsed);
  intent = applyQueryCropOverride(intent, query, previousContext);
  intent = applyQueryCountyOverride(intent, query);
  intent = applyQueryGradeOverride(intent, query);
  intent = applyQueryTagOverride(intent, query);
  intent = applyQueryCertificationOverride(intent, query);
  intent = applyQueryPackagingOverride(intent, query);
  intent = inheritPreviousIntent(intent, query, previousContext);
  intent = applyExpandResultsOverride(intent, query, previousContext);
  intent = normalizeSearchText(intent, query);

  if (intent.crop) {
    assertValidCrop(intent.crop);
  }
  if (intent.county) {
    assertValidCounty(intent.county);
  }
  if (intent.tags) {
    intent.tags = assertValidHardFilterTags(intent.tags);
  }
  if (intent.certifications) {
    intent.certifications = assertValidSearchCertifications(
      intent.certifications,
    );
  }
  if (intent.packaging) {
    intent.packaging = assertValidSearchPackaging(intent.packaging);
  }

  return intent;
}

/** Minimal fallback intent when the orchestrator does not invoke searchListings. */
export function fallbackBuyerSearchIntent(
  query: string,
  previousContext?: BuyerSearchIntentPreviousContext,
): BuyerSearchIntent {
  return normalizeBuyerSearchIntent(
    {
      certifications: null,
      crop: null,
      county: null,
      grade: null,
      maxPricePerKg: null,
      minQuantityKg: null,
      packaging: null,
      searchText: query,
      refinePreviousResults: false,
      pricePreference: null,
      resultLimit: null,
      tags: null,
    },
    query,
    previousContext,
  );
}

export const SEARCH_INTENT_TOOL_RULES = `When calling searchListings, populate structured search fields directly:
- Map user language to these crops only: ${CROP_TYPES.join(", ")}. Examples: corn → maize.
- If the buyer mentions a crop in the latest message, always set crop explicitly — never reuse a crop from earlier turns.
- If no crop is in the latest message, inherit from previous search context only when refining or expanding those same results.
- Context threads: KEEP previous listing context for questions/orders about cards already shown ("how much is that?", "order it", "the cheaper one"). START FRESH when the buyer switches crop (maize → onions) — refinePreviousResults: false and do not reuse the old county/grade/price/tags/certs/packaging unless they repeat them.
- When the buyer asks for more of the same produce ("show me the rest", "any more", "other options"), set refinePreviousResults: false so inventory is searched again (already-shown cards are excluded server-side). Keep the prior crop/county/quality/standards filters.
- Counties must be one of: ${COUNTIES.join(", ")} when mentioned.
- Grade is a strict Quality filter: extract phrases like "grade 2", "Grade A", "Premium", "Standard" into grade (store the grade value, e.g. "2", "A", or "Premium"); when the buyer says "only" grade N, that grade is required — never return other grades for that crop.
- packaging: when the buyer asks for ${LISTING_PACKAGING.join(", ")} (crates, gunny bags, bulk, bags). Strict filter.
- tags: Quality/Standards tags when clearly asked — ${LISTING_HARD_FILTER_TAGS.join(", ")} (e.g. organic, export grade, cold chain, washed, pesticide-free). These are strict AND filters.
- certifications: Standards certifications when clearly asked — ${LISTING_CERTIFICATIONS.join(", ")} (KEPSA, GlobalG.A.P., Fairtrade, organic certified). Strict AND filters. Prefer certifications over tags for "organic certified".
- Put remaining descriptive terms in searchText (urgency, soft preferences not covered above).
- searchText must never be empty.
- minQuantityKg and maxPricePerKg when clearly stated; otherwise omit.
- refinePreviousResults: true ONLY when re-ranking or narrowing cards already shown ("cheaper one", "the first one", "only grade 2 from these"). Never true for "show me the rest/more/others".
- pricePreference: "cheapest" or "most_expensive" when refining by price.
- resultLimit: 1 when the buyer asks for a single option — not when they ask for more/rest.
- For brand-new searches with explicit crop or location, refinePreviousResults: false.
- crop AND county AND grade AND packaging AND tags AND certifications are all strict, exact filters when set — a search must never return listings that fail any set Quality or Standards filter.`;
