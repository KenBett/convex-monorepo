import { COUNTIES, CROP_TYPES } from "@repo/types";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { MIN_INDEXABLE_TEXT_LENGTH } from "./rag";
import { getCurrentUser, getMarketplaceRole } from "./roles";

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
