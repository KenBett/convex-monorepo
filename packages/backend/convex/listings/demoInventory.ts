/**
 * Temporary demo inventory console — edit any listing (incl. seed coops)
 * without signing in as that farmer. Remove this file + /demo/listings UI
 * when demos are done.
 *
 * Gated by DEMO_PAYMENTS=true and signed-in auth.
 */

import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { requireAuthUserId } from "../lib/auth";
import {
  assertValidListingCertifications,
  assertValidListingPackaging,
  assertValidListingTags,
  listingCertificationValidator,
  listingPackagingValidator,
  listingTagValidator,
} from "../lib/listingAttributes";
import {
  assertListingImageStorageId,
  getListingImageUrl,
} from "../lib/listingImages";
import {
  assertPositiveNumber,
  assertValidCounty,
  assertValidCrop,
} from "../lib/listings";
import { SEED_FARMERS } from "./demoInventorySeedData";

function assertDemoInventoryEnabled() {
  if (process.env.DEMO_PAYMENTS !== "true") {
    throw new Error(
      "Demo inventory requires DEMO_PAYMENTS=true on this Convex deployment",
    );
  }
}

/** Resolve Pinterest phrase for listings seeded before demoPinterestQuery existed. */
function resolveDemoPinterestQuery(listing: Doc<"listings">): string | undefined {
  if (listing.demoPinterestQuery) {
    return listing.demoPinterestQuery;
  }

  if (listing.demoSearchPrompt) {
    for (const farmer of SEED_FARMERS) {
      for (const seed of farmer.listings) {
        if (seed.demoSearchPrompt === listing.demoSearchPrompt) {
          return seed.demoPinterestQuery;
        }
      }
    }
  }

  for (const farmer of SEED_FARMERS) {
    for (const seed of farmer.listings) {
      if (
        seed.crop === listing.crop &&
        seed.county === listing.county &&
        (seed.variety ?? undefined) === (listing.variety ?? undefined)
      ) {
        return seed.demoPinterestQuery;
      }
    }
  }

  return undefined;
}

const listingStatusValidator = v.union(
  v.literal("active"),
  v.literal("sold_out"),
  v.literal("expired"),
);

const demoListingSummaryValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("listings"),
  availableFrom: v.optional(v.number()),
  certifications: v.optional(v.array(listingCertificationValidator)),
  cooperativeName: v.string(),
  county: v.string(),
  crop: v.string(),
  demoPinterestQuery: v.optional(v.string()),
  demoSearchPrompt: v.optional(v.string()),
  description: v.string(),
  farmerId: v.id("farmerProfiles"),
  grade: v.optional(v.string()),
  harvestWindowLabel: v.optional(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
  imageUrl: v.union(v.string(), v.null()),
  minOrderKg: v.optional(v.number()),
  packaging: v.optional(listingPackagingValidator),
  packUnitKg: v.optional(v.number()),
  pricePerKg: v.number(),
  quantityKg: v.number(),
  sizeOrCalibre: v.optional(v.string()),
  status: listingStatusValidator,
  tags: v.optional(v.array(listingTagValidator)),
  variety: v.optional(v.string()),
});

const demoFarmerOptionValidator = v.object({
  _id: v.id("farmerProfiles"),
  cooperativeName: v.string(),
  county: v.string(),
});

async function toDemoListingSummary(ctx: QueryCtx, listing: Doc<"listings">) {
  const farmer = await ctx.db.get("farmerProfiles", listing.farmerId);
  const imageUrl = await getListingImageUrl(ctx, listing.imageStorageId);

  return {
    _creationTime: listing._creationTime,
    _id: listing._id,
    availableFrom: listing.availableFrom,
    certifications: listing.certifications,
    cooperativeName: farmer?.cooperativeName ?? "Unknown coop",
    county: listing.county,
    crop: listing.crop,
    demoPinterestQuery: resolveDemoPinterestQuery(listing),
    demoSearchPrompt: listing.demoSearchPrompt,
    description: listing.description,
    farmerId: listing.farmerId,
    grade: listing.grade,
    harvestWindowLabel: listing.harvestWindowLabel,
    imageStorageId: listing.imageStorageId,
    imageUrl,
    minOrderKg: listing.minOrderKg,
    packaging: listing.packaging,
    packUnitKg: listing.packUnitKg,
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
    sizeOrCalibre: listing.sizeOrCalibre,
    status: listing.status,
    tags: listing.tags,
    variety: listing.variety,
  };
}

export const listFarmers = query({
  args: {},
  returns: v.array(demoFarmerOptionValidator),
  handler: async (ctx) => {
    assertDemoInventoryEnabled();
    await requireAuthUserId(ctx);

    // eslint-disable-next-line @convex-dev/no-query-collect -- demo console, bounded farmer set
    const farmers = await ctx.db.query("farmerProfiles").collect();

    return farmers
      .map((farmer) => ({
        _id: farmer._id,
        cooperativeName: farmer.cooperativeName,
        county: farmer.county,
      }))
      .sort((a, b) => a.cooperativeName.localeCompare(b.cooperativeName));
  },
});

export const listAll = query({
  args: {},
  returns: v.array(demoListingSummaryValidator),
  handler: async (ctx) => {
    assertDemoInventoryEnabled();
    await requireAuthUserId(ctx);

    // eslint-disable-next-line @convex-dev/no-query-collect -- temporary demo inventory console
    const listings = await ctx.db.query("listings").order("desc").collect();

    return await Promise.all(
      listings.map((listing) => toDemoListingSummary(ctx, listing)),
    );
  },
});

export const getById = query({
  args: { listingId: v.id("listings") },
  returns: v.union(demoListingSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    assertDemoInventoryEnabled();
    await requireAuthUserId(ctx);

    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing) {
      return null;
    }

    return await toDemoListingSummary(ctx, listing);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    assertDemoInventoryEnabled();
    await requireAuthUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    certifications: v.optional(v.array(listingCertificationValidator)),
    county: v.string(),
    crop: v.string(),
    description: v.string(),
    farmerId: v.id("farmerProfiles"),
    grade: v.optional(v.string()),
    harvestWindowLabel: v.optional(v.string()),
    imageStorageId: v.id("_storage"),
    minOrderKg: v.optional(v.number()),
    packaging: v.optional(listingPackagingValidator),
    packUnitKg: v.optional(v.number()),
    pricePerKg: v.number(),
    quantityKg: v.number(),
    sizeOrCalibre: v.optional(v.string()),
    tags: v.optional(v.array(listingTagValidator)),
    variety: v.optional(v.string()),
  },
  returns: v.id("listings"),
  handler: async (ctx, args) => {
    assertDemoInventoryEnabled();
    await requireAuthUserId(ctx);

    const farmer = await ctx.db.get("farmerProfiles", args.farmerId);
    if (!farmer) {
      throw new Error("Farmer profile not found");
    }

    assertValidCrop(args.crop);
    assertValidCounty(args.county);
    assertPositiveNumber(args.quantityKg, "Quantity");
    assertPositiveNumber(args.pricePerKg, "Price");
    if (args.minOrderKg !== undefined) {
      assertPositiveNumber(args.minOrderKg, "Minimum order");
    }
    if (args.packUnitKg !== undefined) {
      assertPositiveNumber(args.packUnitKg, "Pack unit");
    }
    await assertListingImageStorageId(ctx, args.imageStorageId);

    const description = args.description.trim();
    if (description.length === 0) {
      throw new Error("Description is required");
    }

    const tags = assertValidListingTags(args.tags ?? []);
    const certifications = assertValidListingCertifications(
      args.certifications ?? [],
    );
    const packaging = assertValidListingPackaging(args.packaging);

    const listingId = await ctx.db.insert("listings", {
      certifications: certifications.length > 0 ? certifications : undefined,
      county: args.county,
      crop: args.crop,
      description,
      farmerId: args.farmerId,
      grade: args.grade?.trim() || undefined,
      harvestWindowLabel: args.harvestWindowLabel?.trim() || undefined,
      imageStorageId: args.imageStorageId,
      minOrderKg: args.minOrderKg,
      packaging,
      packUnitKg: args.packUnitKg,
      pricePerKg: args.pricePerKg,
      quantityKg: args.quantityKg,
      sizeOrCalibre: args.sizeOrCalibre?.trim() || undefined,
      status: "active",
      tags: tags.length > 0 ? tags : undefined,
      variety: args.variety?.trim() || undefined,
    });

    await ctx.scheduler.runAfter(0, internal.listings.ragSync.syncListingToRag, {
      listingId,
    });

    return listingId;
  },
});

export const update = mutation({
  args: {
    certifications: v.optional(v.array(listingCertificationValidator)),
    county: v.optional(v.string()),
    crop: v.optional(v.string()),
    description: v.optional(v.string()),
    grade: v.optional(v.string()),
    harvestWindowLabel: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    listingId: v.id("listings"),
    minOrderKg: v.optional(v.union(v.number(), v.null())),
    packaging: v.optional(listingPackagingValidator),
    packUnitKg: v.optional(v.union(v.number(), v.null())),
    pricePerKg: v.optional(v.number()),
    quantityKg: v.optional(v.number()),
    sizeOrCalibre: v.optional(v.string()),
    tags: v.optional(v.array(listingTagValidator)),
    variety: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertDemoInventoryEnabled();
    await requireAuthUserId(ctx);

    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    const updates: {
      certifications?: Doc<"listings">["certifications"];
      county?: string;
      crop?: string;
      description?: string;
      grade?: string;
      harvestWindowLabel?: string;
      imageStorageId?: Id<"_storage">;
      minOrderKg?: number;
      packaging?: Doc<"listings">["packaging"];
      packUnitKg?: number;
      pricePerKg?: number;
      quantityKg?: number;
      sizeOrCalibre?: string;
      tags?: Doc<"listings">["tags"];
      variety?: string;
    } = {};

    if (args.crop !== undefined) {
      assertValidCrop(args.crop);
      updates.crop = args.crop;
    }
    if (args.county !== undefined) {
      assertValidCounty(args.county);
      updates.county = args.county;
    }
    if (args.quantityKg !== undefined) {
      assertPositiveNumber(args.quantityKg, "Quantity");
      updates.quantityKg = args.quantityKg;
    }
    if (args.pricePerKg !== undefined) {
      assertPositiveNumber(args.pricePerKg, "Price");
      updates.pricePerKg = args.pricePerKg;
    }
    if (args.description !== undefined) {
      const description = args.description.trim();
      if (description.length === 0) {
        throw new Error("Description is required");
      }
      updates.description = description;
    }
    if (args.grade !== undefined) {
      updates.grade = args.grade.trim() || undefined;
    }
    if (args.imageStorageId !== undefined) {
      await assertListingImageStorageId(ctx, args.imageStorageId);
      updates.imageStorageId = args.imageStorageId;
    }
    if (args.tags !== undefined) {
      const tags = assertValidListingTags(args.tags);
      updates.tags = tags.length > 0 ? tags : undefined;
    }
    if (args.certifications !== undefined) {
      const certifications = assertValidListingCertifications(
        args.certifications,
      );
      updates.certifications =
        certifications.length > 0 ? certifications : undefined;
    }
    if (args.packaging !== undefined) {
      updates.packaging = assertValidListingPackaging(args.packaging);
    }
    if (args.variety !== undefined) {
      updates.variety = args.variety.trim() || undefined;
    }
    if (args.harvestWindowLabel !== undefined) {
      updates.harvestWindowLabel = args.harvestWindowLabel.trim() || undefined;
    }
    if (args.sizeOrCalibre !== undefined) {
      updates.sizeOrCalibre = args.sizeOrCalibre.trim() || undefined;
    }
    if (args.minOrderKg !== undefined) {
      if (args.minOrderKg === null) {
        updates.minOrderKg = undefined;
      } else {
        assertPositiveNumber(args.minOrderKg, "Minimum order");
        updates.minOrderKg = args.minOrderKg;
      }
    }
    if (args.packUnitKg !== undefined) {
      if (args.packUnitKg === null) {
        updates.packUnitKg = undefined;
      } else {
        assertPositiveNumber(args.packUnitKg, "Pack unit");
        updates.packUnitKg = args.packUnitKg;
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch("listings", args.listingId, updates);
    await ctx.scheduler.runAfter(0, internal.listings.ragSync.syncListingToRag, {
      listingId: args.listingId,
    });

    return null;
  },
});

export const updateStatus = mutation({
  args: {
    listingId: v.id("listings"),
    soldOut: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertDemoInventoryEnabled();
    await requireAuthUserId(ctx);

    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }
    if (listing.status === "expired") {
      throw new Error("Expired listings cannot be updated");
    }

    const nextStatus = args.soldOut ? "sold_out" : "active";
    if (listing.status === nextStatus) {
      return null;
    }

    await ctx.db.patch("listings", args.listingId, { status: nextStatus });
    await ctx.scheduler.runAfter(0, internal.listings.ragSync.syncListingToRag, {
      listingId: args.listingId,
    });

    return null;
  },
});

export const remove = mutation({
  args: {
    listingId: v.id("listings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertDemoInventoryEnabled();
    await requireAuthUserId(ctx);

    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    await ctx.db.delete("listings", args.listingId);
    await ctx.scheduler.runAfter(
      0,
      internal.listings.ragSync.removeListingFromRag,
      { listingId: args.listingId },
    );

    return null;
  },
});
