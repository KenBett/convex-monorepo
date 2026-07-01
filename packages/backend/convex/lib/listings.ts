import { COUNTIES, CROP_TYPES } from "@repo/types";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { MIN_INDEXABLE_TEXT_LENGTH } from "./rag";
import { getCurrentUser, getMarketplaceRole } from "./roles";

export const STAGE_A_RAG_MARKER = "STAGE_A_RAG_VERIFICATION";
export const STAGE_B_CROP_MARKER = "STAGE_B_CROP_FILTER_VERIFICATION";

export function isDebugListingDescription(description: string): boolean {
  return (
    description.includes(STAGE_A_RAG_MARKER) ||
    description.includes(STAGE_B_CROP_MARKER)
  );
}

export function assertValidCrop(crop: string): void {
  if (!(CROP_TYPES as readonly string[]).includes(crop)) {
    throw new Error("Invalid crop");
  }
}

export function assertValidCounty(county: string): void {
  if (!(COUNTIES as readonly string[]).includes(county)) {
    throw new Error("Invalid county");
  }
}

export function assertPositiveNumber(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive number`);
  }
}

function normalizeCooperativeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(cooperative|co-op|society|group)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fuzzy substring match used to resolve a buyer's cooperative hint to a listing's cooperative name. */
export function matchesCooperative(listingName: string, query?: string): boolean {
  if (!query) {
    return true;
  }

  const normalizedListing = normalizeCooperativeName(listingName);
  const normalizedQuery = normalizeCooperativeName(query);

  return (
    normalizedListing.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedListing)
  );
}

/**
 * Strict-but-fuzzy grade match: a query is only satisfied when the listing has a grade
 * and the two values overlap (e.g. "grade 2" matches "Grade 2 (Premium)"). Used as a hard
 * filter in both search and order resolution so grade requests never silently pass through.
 */
export function matchesGrade(listingGrade?: string, query?: string): boolean {
  if (!query) {
    return true;
  }

  if (!listingGrade) {
    return false;
  }

  const listing = listingGrade.toLowerCase();
  const gradeQuery = query.toLowerCase().replace(/^grade\s*/i, "");

  return listing.includes(gradeQuery) || gradeQuery.includes(listing);
}

export async function requireFarmerProfile(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"farmerProfiles">> {
  const user = await getCurrentUser(ctx);
  if (getMarketplaceRole(user) !== "farmer") {
    throw new Error("Farmer access required");
  }

  const profile = await ctx.db
    .query("farmerProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();

  if (!profile) {
    throw new Error("Farmer profile not found");
  }

  return profile;
}

export async function requireBuyerProfile(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"buyerProfiles">> {
  const user = await getCurrentUser(ctx);
  if (getMarketplaceRole(user) !== "buyer") {
    throw new Error("Buyer access required");
  }

  const profile = await ctx.db
    .query("buyerProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();

  if (!profile) {
    throw new Error("Buyer profile not found");
  }

  return profile;
}

export function formatListingText(
  listing: Pick<
    Doc<"listings">,
    | "county"
    | "crop"
    | "description"
    | "grade"
    | "pricePerKg"
    | "quantityKg"
    | "status"
  >,
): string {
  const gradeSentence =
    listing.grade !== undefined && listing.grade.trim().length > 0
      ? ` Grade: ${listing.grade.trim()}.`
      : "";

  const text =
    `This listing offers ${listing.quantityKg} kg of ${listing.crop} at KES ${listing.pricePerKg} per kg in ${listing.county} county.` +
    `${gradeSentence} Status: ${listing.status}. Description: ${listing.description.trim()}.`;

  if (text.length >= MIN_INDEXABLE_TEXT_LENGTH) {
    return text;
  }

  return `${text} Available produce listing on the Offtake marketplace.`;
}
