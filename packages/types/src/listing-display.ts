const DEBUG_LISTING_MARKERS = [
  "STAGE_A_RAG_VERIFICATION",
  "STAGE_B_CROP_FILTER_VERIFICATION",
] as const;

const RAG_INDEX_SNIPPET_PREFIX = "This listing offers";

export function isDebugListingDescription(description: string): boolean {
  return DEBUG_LISTING_MARKERS.some((marker) => description.includes(marker));
}

/** Buyer-facing description, or null when empty / internal test data. */
export function getBuyerListingDescription(description: string): string | null {
  const trimmed = description.trim();
  if (trimmed.length === 0 || isDebugListingDescription(trimmed)) {
    return null;
  }

  return trimmed;
}

/** RAG snippet when it adds detail beyond the card header and description. */
export function getBuyerListingSnippet(
  snippet: string,
  description: string | null,
): string | null {
  const trimmed = snippet.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.startsWith(RAG_INDEX_SNIPPET_PREFIX)) {
    return null;
  }

  if (isDebugListingDescription(trimmed)) {
    return null;
  }

  if (description && trimmed.includes(description)) {
    return null;
  }

  return trimmed;
}
