import {
  LISTING_CERTIFICATIONS,
  LISTING_CERTIFICATION_LABELS,
  LISTING_HARD_FILTER_TAGS,
  LISTING_PACKAGING,
  LISTING_PACKAGING_LABELS,
  LISTING_TAGS,
  LISTING_TAG_LABELS,
  isListingCertification,
  isListingHardFilterTag,
  isListingPackaging,
  isListingTag,
  type ListingCertification,
  type ListingHardFilterTag,
  type ListingPackaging,
  type ListingTag,
} from "@repo/types";
import { v } from "convex/values";

export const listingTagValidator = v.union(
  v.literal("organic"),
  v.literal("export_grade"),
  v.literal("washed"),
  v.literal("sorted"),
  v.literal("cold_chain"),
  v.literal("pesticide_free"),
  v.literal("irrigated"),
  v.literal("dried"),
  v.literal("fresh_picked"),
  v.literal("bulk_ready"),
  v.literal("sample_available"),
  v.literal("traceable"),
  v.literal("weekly_supply"),
);

export const listingPackagingValidator = v.union(
  v.literal("bulk"),
  v.literal("crates"),
  v.literal("gunny_bags"),
  v.literal("bags"),
);

export const listingCertificationValidator = v.union(
  v.literal("kepsa"),
  v.literal("globalgap"),
  v.literal("fairtrade"),
  v.literal("organic_certified"),
);

export const listingHardFilterTagValidator = v.union(
  v.literal("organic"),
  v.literal("export_grade"),
  v.literal("pesticide_free"),
);

export const profileLocationInputValidator = v.object({
  locationLabel: v.optional(v.string()),
  locationLat: v.number(),
  locationLng: v.number(),
});

export function assertValidListingTags(tags: string[]): ListingTag[] {
  const unique = Array.from(new Set(tags));
  for (const tag of unique) {
    if (!isListingTag(tag)) {
      throw new Error(`Invalid listing tag: ${tag}`);
    }
  }
  return unique as ListingTag[];
}

export function assertValidListingCertifications(
  certifications: string[],
): ListingCertification[] {
  const unique = Array.from(new Set(certifications));
  for (const certification of unique) {
    if (!isListingCertification(certification)) {
      throw new Error(`Invalid listing certification: ${certification}`);
    }
  }
  return unique as ListingCertification[];
}

export function assertValidListingPackaging(
  packaging: string | undefined,
): ListingPackaging | undefined {
  if (packaging === undefined) {
    return undefined;
  }
  if (!isListingPackaging(packaging)) {
    throw new Error(`Invalid listing packaging: ${packaging}`);
  }
  return packaging;
}

export function assertValidHardFilterTags(
  tags: string[] | undefined,
): ListingHardFilterTag[] | undefined {
  if (!tags || tags.length === 0) {
    return undefined;
  }
  const unique = Array.from(new Set(tags));
  for (const tag of unique) {
    if (!isListingHardFilterTag(tag)) {
      throw new Error(`Invalid hard-filter tag: ${tag}`);
    }
  }
  return unique as ListingHardFilterTag[];
}

export function formatListingAttributeSentence(input: {
  certifications?: ListingCertification[];
  harvestWindowLabel?: string;
  minOrderKg?: number;
  packaging?: ListingPackaging;
  packUnitKg?: number;
  sizeOrCalibre?: string;
  tags?: ListingTag[];
  variety?: string;
}): string {
  const parts: string[] = [];

  if (input.variety?.trim()) {
    parts.push(`Variety: ${input.variety.trim()}.`);
  }
  if (input.sizeOrCalibre?.trim()) {
    parts.push(`Size/calibre: ${input.sizeOrCalibre.trim()}.`);
  }
  if (input.tags && input.tags.length > 0) {
    parts.push(
      `Tags: ${input.tags.map((tag) => LISTING_TAG_LABELS[tag]).join(", ")}.`,
    );
  }
  if (input.certifications && input.certifications.length > 0) {
    parts.push(
      `Certifications: ${input.certifications
        .map((cert) => LISTING_CERTIFICATION_LABELS[cert])
        .join(", ")}.`,
    );
  }
  if (input.packaging) {
    parts.push(`Packaging: ${LISTING_PACKAGING_LABELS[input.packaging]}.`);
  }
  if (input.packUnitKg != null && input.packUnitKg > 0) {
    parts.push(`Pack unit: ${input.packUnitKg} kg.`);
  }
  if (input.minOrderKg != null && input.minOrderKg > 0) {
    parts.push(`Minimum order: ${input.minOrderKg} kg.`);
  }
  if (input.harvestWindowLabel?.trim()) {
    parts.push(`Harvest window: ${input.harvestWindowLabel.trim()}.`);
  }

  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

export {
  LISTING_CERTIFICATIONS,
  LISTING_HARD_FILTER_TAGS,
  LISTING_PACKAGING,
  LISTING_TAGS,
};
