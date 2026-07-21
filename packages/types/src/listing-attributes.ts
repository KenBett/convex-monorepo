export const LISTING_TAGS = [
  "organic",
  "export_grade",
  "washed",
  "sorted",
  "cold_chain",
  "pesticide_free",
  "irrigated",
  "dried",
  "fresh_picked",
  "bulk_ready",
  "sample_available",
  "traceable",
  "weekly_supply",
] as const;

export type ListingTag = (typeof LISTING_TAGS)[number];

/** Common produce grades for Kenya offtake listings (single-select). */
export const LISTING_GRADES = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade A",
  "Grade B",
  "Grade C",
  "Premium",
  "Standard",
] as const;

export type ListingGrade = (typeof LISTING_GRADES)[number];

/** Tags that become hard AND filters when present in buyer search intent. */
export const LISTING_HARD_FILTER_TAGS = [
  "organic",
  "export_grade",
  "pesticide_free",
] as const;

export type ListingHardFilterTag = (typeof LISTING_HARD_FILTER_TAGS)[number];

export const LISTING_PACKAGING = [
  "bulk",
  "crates",
  "gunny_bags",
  "bags",
] as const;

export type ListingPackaging = (typeof LISTING_PACKAGING)[number];

export const LISTING_CERTIFICATIONS = [
  "kepsa",
  "globalgap",
  "fairtrade",
  "organic_certified",
] as const;

export type ListingCertification = (typeof LISTING_CERTIFICATIONS)[number];

export const LISTING_TAG_LABELS: Record<ListingTag, string> = {
  organic: "Organic",
  export_grade: "Export grade",
  washed: "Washed",
  sorted: "Sorted",
  cold_chain: "Cold chain",
  pesticide_free: "Pesticide-free",
  irrigated: "Irrigated",
  dried: "Dried",
  fresh_picked: "Fresh picked",
  bulk_ready: "Bulk ready",
  sample_available: "Sample available",
  traceable: "Traceable",
  weekly_supply: "Weekly supply",
};

export const LISTING_PACKAGING_LABELS: Record<ListingPackaging, string> = {
  bulk: "Bulk",
  crates: "Crates",
  gunny_bags: "Gunny bags",
  bags: "Bags",
};

export const LISTING_CERTIFICATION_LABELS: Record<
  ListingCertification,
  string
> = {
  kepsa: "KEPSA",
  globalgap: "GlobalG.A.P.",
  fairtrade: "Fairtrade",
  organic_certified: "Organic certified",
};

export function isListingTag(value: string): value is ListingTag {
  return (LISTING_TAGS as readonly string[]).includes(value);
}

export function isListingGrade(value: string): value is ListingGrade {
  return (LISTING_GRADES as readonly string[]).includes(value);
}

/**
 * Display label for a saved grade. Bare seeds like "1" / "A" become "Grade 1" / "Grade A".
 * Already-prefixed or named grades (Premium, Standard) pass through.
 */
export function formatListingGradeLabel(grade: string): string {
  const trimmed = grade.trim();
  if (!trimmed || isListingGrade(trimmed)) {
    return trimmed;
  }
  const digit = /^([1-3])$/.exec(trimmed);
  if (digit?.[1]) {
    return `Grade ${digit[1]}`;
  }
  const letter = /^([abc])$/i.exec(trimmed);
  if (letter?.[1]) {
    return `Grade ${letter[1].toUpperCase()}`;
  }
  return trimmed;
}

/** Chip options; keeps a custom saved grade visible when it is not in the catalog. */
export function listingGradeOptions(current?: string | null): string[] {
  const trimmed = current?.trim();
  if (trimmed && !isListingGrade(trimmed)) {
    return [...LISTING_GRADES, trimmed];
  }
  return [...LISTING_GRADES];
}

export function isListingHardFilterTag(
  value: string,
): value is ListingHardFilterTag {
  return (LISTING_HARD_FILTER_TAGS as readonly string[]).includes(value);
}

export function isListingPackaging(value: string): value is ListingPackaging {
  return (LISTING_PACKAGING as readonly string[]).includes(value);
}

export function isListingCertification(
  value: string,
): value is ListingCertification {
  return (LISTING_CERTIFICATIONS as readonly string[]).includes(value);
}

type ListingCardMetaInput = {
  county: string;
  grade?: string | null;
  minOrderKg?: number | null;
  packUnitKg?: number | null;
  quantityKg: number;
  sizeOrCalibre?: string | null;
};

/** Spec chips for listing cards (qty, grade, size, min, pack, county). */
export function listingCardMetaParts(listing: ListingCardMetaInput): string[] {
  const parts: string[] = [`${listing.quantityKg} kg`];
  if (listing.grade?.trim()) {
    parts.push(formatListingGradeLabel(listing.grade));
  }
  if (listing.sizeOrCalibre?.trim()) {
    parts.push(listing.sizeOrCalibre.trim());
  }
  if (listing.minOrderKg != null && listing.minOrderKg > 0) {
    parts.push(`min ${listing.minOrderKg} kg`);
  }
  if (listing.packUnitKg != null && listing.packUnitKg > 0) {
    parts.push(`${listing.packUnitKg} kg packs`);
  }
  parts.push(listing.county);
  return parts;
}

/** Compact meta line for listing cards (qty · grade · size · min · pack · county). */
export function formatListingCardMeta(listing: ListingCardMetaInput): string {
  return listingCardMetaParts(listing).join(" · ");
}

export type ListingCardFaceInput = {
  certifications?: readonly string[] | null;
  county: string;
  description?: string | null;
  grade?: string | null;
  harvestWindowLabel?: string | null;
  minOrderKg?: number | null;
  packaging?: string | null;
  packUnitKg?: number | null;
  pricePerKg: number;
  quantityKg: number;
  sizeOrCalibre?: string | null;
  tags?: readonly string[] | null;
  variety?: string | null;
};

export type ListingCardFaceModel = {
  attributeChips: string[];
  commerceChips: string[];
  county: string;
  description: string | null;
  harvestLabel: string | null;
  pricePerKg: number;
  qualityChips: string[];
  variety: string | null;
};

function packagingLabel(value: string): string {
  return isListingPackaging(value)
    ? LISTING_PACKAGING_LABELS[value]
    : value.trim();
}

function certificationLabel(value: string): string {
  return isListingCertification(value)
    ? LISTING_CERTIFICATION_LABELS[value]
    : value.trim();
}

function tagLabel(value: string): string {
  return isListingTag(value) ? LISTING_TAG_LABELS[value] : value.trim();
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type HarvestDateParts = {
  day: number;
  month: number;
  year: number;
};

function parseHarvestDateParts(value: string): HarvestDateParts | null {
  const match = value
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (!match?.[1] || !match[2] || !match[3]) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}

function formatHarvestDateParts(parts: HarvestDateParts): string {
  const month = SHORT_MONTHS[parts.month - 1];
  if (!month) {
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  }
  return `${month} ${parts.day}, ${parts.year}`;
}

function formatHarvestDateRange(
  start: HarvestDateParts,
  end: HarvestDateParts,
): string {
  const startMonth = SHORT_MONTHS[start.month - 1];
  const endMonth = SHORT_MONTHS[end.month - 1];
  if (!startMonth || !endMonth) {
    return `${formatHarvestDateParts(start)} – ${formatHarvestDateParts(end)}`;
  }

  if (start.year === end.year && start.month === end.month) {
    if (start.day === end.day) {
      return formatHarvestDateParts(start);
    }
    return `${startMonth} ${start.day}–${end.day}, ${start.year}`;
  }

  if (start.year === end.year) {
    return `${startMonth} ${start.day} – ${endMonth} ${end.day}, ${start.year}`;
  }

  return `${formatHarvestDateParts(start)} – ${formatHarvestDateParts(end)}`;
}

/**
 * Short human-readable harvest / availability label for cards.
 * Accepts "Ready now", YYYY-MM-DD, ISO datetimes, and "start – end" ranges.
 * Free-text labels pass through unchanged.
 */
export function formatHarvestWindowLabel(
  label: string | null | undefined,
): string | null {
  const trimmed = label?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^ready now$/i.test(trimmed)) {
    return "Ready now";
  }

  const rangeMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2}(?:T[^\s–—]*)?)\s*[–—-]\s*(\d{4}-\d{2}-\d{2}(?:T[^\s–—]*)?)$/i,
  );
  if (rangeMatch?.[1] && rangeMatch[2]) {
    const start = parseHarvestDateParts(rangeMatch[1]);
    const end = parseHarvestDateParts(rangeMatch[2]);
    if (start && end) {
      return formatHarvestDateRange(start, end);
    }
  }

  const single = parseHarvestDateParts(trimmed);
  if (single) {
    return formatHarvestDateParts(single);
  }

  return trimmed;
}

/**
 * Card-face model: only populated optional fields become chips / lines.
 * Always includes county, quantity, and price (required listing fields).
 */
export function buildListingCardFace(
  listing: ListingCardFaceInput,
): ListingCardFaceModel {
  const commerceChips = [`${listing.quantityKg} kg`];
  if (listing.minOrderKg != null && listing.minOrderKg > 0) {
    commerceChips.push(`Min ${listing.minOrderKg} kg`);
  }

  const qualityChips: string[] = [];
  if (listing.grade?.trim()) {
    qualityChips.push(formatListingGradeLabel(listing.grade));
  }
  if (listing.sizeOrCalibre?.trim()) {
    qualityChips.push(listing.sizeOrCalibre.trim());
  }
  if (listing.packaging?.trim()) {
    qualityChips.push(packagingLabel(listing.packaging));
  }
  if (listing.packUnitKg != null && listing.packUnitKg > 0) {
    qualityChips.push(`${listing.packUnitKg} kg packs`);
  }

  const attributeChips: string[] = [];
  for (const cert of listing.certifications ?? []) {
    const label = certificationLabel(cert);
    if (label) {
      attributeChips.push(label);
    }
  }
  for (const tag of listing.tags ?? []) {
    const label = tagLabel(tag);
    if (label) {
      attributeChips.push(label);
    }
  }

  const description = listing.description?.trim() || null;
  const harvestLabel = formatHarvestWindowLabel(listing.harvestWindowLabel);
  const variety = listing.variety?.trim() || null;

  return {
    attributeChips,
    commerceChips,
    county: listing.county,
    description,
    harvestLabel,
    pricePerKg: listing.pricePerKg,
    qualityChips,
    variety,
  };
}
