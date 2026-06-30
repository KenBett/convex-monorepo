import type { MarketplaceRole } from "@repo/types";

export const MARKETPLACE_ROLES: readonly MarketplaceRole[] = [
  "farmer",
  "buyer",
] as const;

/**
 * The route segment a role lands on after auth + onboarding.
 * Web composes `/${segment}`; mobile composes `/(${segment})`.
 */
export function roleHomeSegment(role: MarketplaceRole): MarketplaceRole {
  return role;
}

/** Web path for a farmer-owned listing detail page. */
export function farmerListingDetailPath(listingId: string): string {
  return `/farmer/listings/${listingId}`;
}

/** Expo Router href for a farmer-owned listing detail screen. */
export function farmerListingDetailHref(listingId: string): string {
  return `/(farmer)/listings/${listingId}`;
}

/** Two-letter initials for avatars, derived from name then email. */
export function getInitials(
  name: string | undefined,
  email: string | undefined,
  fallback = "?",
): string {
  if (name) {
    const initials = name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase();
    if (initials) {
      return initials;
    }
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return fallback;
}
