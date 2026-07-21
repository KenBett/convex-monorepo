const DEBUG_LISTING_MARKERS = [
  "STAGE_A_RAG_VERIFICATION",
  "STAGE_B_CROP_FILTER_VERIFICATION",
] as const;

/** Kept in DB for reseeding; never shown to buyers. */
export const DEMO_INVENTORY_SEED_MARKER = "DEMO_INVENTORY_SEED";

/** @deprecated Use DEMO_INVENTORY_SEED_MARKER — kept for stripping legacy descriptions. */
export const DEMO_HOTEL_SEED_MARKER = "DEMO_HOTEL_SEED";

const RAG_INDEX_SNIPPET_PREFIX = "This listing offers";

export function isDebugListingDescription(description: string): boolean {
  return DEBUG_LISTING_MARKERS.some((marker) => description.includes(marker));
}

/** Remove internal seed/debug prefixes from buyer-facing copy. */
export function stripInternalListingMarkers(text: string): string {
  return text
    .replace(new RegExp(`\\b${DEMO_INVENTORY_SEED_MARKER}\\s*:\\s*`, "gi"), "")
    .replace(new RegExp(`\\b${DEMO_HOTEL_SEED_MARKER}\\s*:\\s*`, "gi"), "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Buyer-facing description, or null when empty / internal test data. */
export function getBuyerListingDescription(description: string): string | null {
  const trimmed = stripInternalListingMarkers(description);
  if (trimmed.length === 0 || isDebugListingDescription(description)) {
    return null;
  }

  return trimmed;
}

/** RAG snippet when it adds detail beyond the card header and description. */
export function getBuyerListingSnippet(
  snippet: string,
  description: string | null,
): string | null {
  let usable = stripInternalListingMarkers(snippet);
  if (usable.length === 0) {
    return null;
  }

  if (isDebugListingDescription(snippet)) {
    return null;
  }

  // Strip the boilerplate index prefix so glass-box "why" can show.
  if (usable.startsWith(RAG_INDEX_SNIPPET_PREFIX)) {
    const descriptionMarker = "Description: ";
    const descriptionIndex = usable.indexOf(descriptionMarker);
    if (descriptionIndex >= 0) {
      usable = stripInternalListingMarkers(
        usable.slice(descriptionIndex + descriptionMarker.length),
      );
    } else {
      return null;
    }
  }

  if (usable.length === 0) {
    return null;
  }

  if (description && usable === description) {
    // Still useful as a one-line why on cards.
    return usable.length > 140 ? `${usable.slice(0, 137)}…` : usable;
  }

  if (
    description &&
    usable.includes(description) &&
    usable.length > description.length + 20
  ) {
    return usable.length > 140 ? `${usable.slice(0, 137)}…` : usable;
  }

  return usable.length > 140 ? `${usable.slice(0, 137)}…` : usable;
}
