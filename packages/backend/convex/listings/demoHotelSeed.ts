/**
 * Demo inventory seed pack — 50 listings for semantic search rehearsal.
 *
 * Destructive: deletes ALL drives, orders, and listings on the deployment,
 * clears RAG listing entries, then inserts the seed pack (no images).
 *
 * Run (dev):
 *   bunx convex run listings/demoHotelSeed:seedHotelDemoInventory
 *
 * Requires DEMO_PAYMENTS=true.
 */

import { DEMO_INVENTORY_SEED_MARKER } from "@repo/types";
import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  type ActionCtx,
  type MutationCtx,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { GLOBAL_NAMESPACE, rag } from "../lib/rag";
import { SEED_FARMERS } from "./demoInventorySeedData";

export { DEMO_INVENTORY_SEED_MARKER };
/** @deprecated Use DEMO_INVENTORY_SEED_MARKER */
export { DEMO_HOTEL_SEED_MARKER } from "@repo/types";

async function deleteAllInTable(
  ctx: MutationCtx,
  table: "drives" | "orders" | "listings",
): Promise<number> {
  // eslint-disable-next-line @convex-dev/no-query-collect -- demo reseeding wipe
  const rows = await ctx.db.query(table).collect();
  for (const row of rows) {
    await ctx.db.delete(table, row._id);
  }
  return rows.length;
}

export const clearAllDemoInventory = internalMutation({
  args: {},
  returns: v.object({
    deletedDrives: v.number(),
    deletedListings: v.number(),
    deletedOrders: v.number(),
    storageFiles: v.number(),
  }),
  handler: async (ctx) => {
    const deletedDrives = await deleteAllInTable(ctx, "drives");
    const deletedOrders = await deleteAllInTable(ctx, "orders");

    // eslint-disable-next-line @convex-dev/no-query-collect -- demo reseeding wipe
    const listings = await ctx.db.query("listings").collect();
    let storageFiles = 0;
    for (const listing of listings) {
      if (listing.imageStorageId) {
        try {
          await ctx.storage.delete(listing.imageStorageId);
          storageFiles += 1;
        } catch {
          // Ignore missing storage objects.
        }
      }
      await ctx.db.delete("listings", listing._id);
    }

    return {
      deletedDrives,
      deletedListings: listings.length,
      deletedOrders,
      storageFiles,
    };
  },
});

/** @deprecated Prefer clearAllDemoInventory — kept for one-off marker cleanup. */
export const clearHotelDemoSeed = internalMutation({
  args: {},
  returns: v.object({
    deletedListings: v.number(),
  }),
  handler: async (ctx) => {
    // eslint-disable-next-line @convex-dev/no-query-collect -- demo reseeding
    const listings = await ctx.db.query("listings").collect();
    let deletedListings = 0;

    for (const listing of listings) {
      const isSeed =
        listing.description.includes(DEMO_INVENTORY_SEED_MARKER) ||
        listing.description.includes("DEMO_HOTEL_SEED");
      if (!isSeed) {
        continue;
      }
      if (listing.imageStorageId) {
        try {
          await ctx.storage.delete(listing.imageStorageId);
        } catch {
          // Ignore missing storage objects.
        }
      }
      await ctx.db.delete("listings", listing._id);
      deletedListings += 1;
    }

    return { deletedListings };
  },
});

export const clearListingRagNamespace = internalAction({
  args: {},
  returns: v.object({ deletedEntries: v.number() }),
  handler: async (ctx): Promise<{ deletedEntries: number }> => {
    const namespace = await rag.getNamespace(ctx, {
      namespace: GLOBAL_NAMESPACE,
    });
    if (!namespace) {
      return { deletedEntries: 0 };
    }

    let deletedEntries = 0;
    let cursor: string | null = null;
    for (;;) {
      const listResult = await rag.list(ctx, {
        namespaceId: namespace.namespaceId,
        paginationOpts: { cursor, numItems: 100 },
      });

      for (const entry of listResult.page) {
        await rag.delete(ctx, { entryId: entry.entryId });
        deletedEntries += 1;
      }

      if (listResult.isDone) {
        break;
      }
      cursor = listResult.continueCursor;
    }

    return { deletedEntries };
  },
});

export const upsertHotelDemoFarmersAndListings = internalMutation({
  args: {},
  returns: v.object({
    farmerCount: v.number(),
    listingIds: v.array(v.id("listings")),
  }),
  handler: async (ctx) => {
    const listingIds: Array<Id<"listings">> = [];
    let farmerCount = 0;

    for (const farmer of SEED_FARMERS) {
      const existingUsers = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", farmer.email))
        .take(1);
      let userId = existingUsers[0]?._id;

      if (!userId) {
        userId = await ctx.db.insert("users", {
          email: farmer.email,
          emailVerificationTime: Date.now(),
          name: farmer.name,
          onboardingComplete: true,
          phone: farmer.phoneNumber,
          role: "farmer",
        });
      } else {
        await ctx.db.patch("users", userId, {
          name: farmer.name,
          onboardingComplete: true,
          phone: farmer.phoneNumber,
          role: "farmer",
        });
      }

      const existingProfile = await ctx.db
        .query("farmerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();

      let farmerId = existingProfile?._id;
      if (!farmerId) {
        farmerId = await ctx.db.insert("farmerProfiles", {
          cooperativeName: farmer.cooperativeName,
          county: farmer.county,
          locationCapturedAt: Date.now(),
          locationLabel: farmer.locationLabel,
          locationLat: farmer.locationLat,
          locationLng: farmer.locationLng,
          mpesaNumber: farmer.phoneNumber,
          phoneNumber: farmer.phoneNumber,
          userId,
        });
      } else {
        await ctx.db.patch("farmerProfiles", farmerId, {
          cooperativeName: farmer.cooperativeName,
          county: farmer.county,
          locationCapturedAt: Date.now(),
          locationLabel: farmer.locationLabel,
          locationLat: farmer.locationLat,
          locationLng: farmer.locationLng,
          mpesaNumber: farmer.phoneNumber,
          phoneNumber: farmer.phoneNumber,
        });
      }

      farmerCount += 1;

      for (const listing of farmer.listings) {
        const listingId = await ctx.db.insert("listings", {
          certifications: listing.certifications,
          county: listing.county,
          crop: listing.crop,
          demoPinterestQuery: listing.demoPinterestQuery,
          demoSearchPrompt: listing.demoSearchPrompt,
          description: listing.description,
          farmerId,
          grade: listing.grade,
          harvestWindowLabel: listing.harvestWindowLabel,
          minOrderKg: listing.minOrderKg,
          packaging: listing.packaging,
          packUnitKg: listing.packUnitKg,
          pricePerKg: listing.pricePerKg,
          quantityKg: listing.quantityKg,
          sizeOrCalibre: listing.sizeOrCalibre,
          status: "active",
          tags: listing.tags,
          variety: listing.variety,
        });
        listingIds.push(listingId);
      }
    }

    return { farmerCount, listingIds };
  },
});

async function runHotelDemoSeed(ctx: ActionCtx): Promise<{
  deletedDrives: number;
  deletedListings: number;
  deletedOrders: number;
  deletedRagEntries: number;
  farmerCount: number;
  listingCount: number;
  storageFiles: number;
  syncedCount: number;
}> {
  const ragCleared = await ctx.runAction(
    internal.listings.demoHotelSeed.clearListingRagNamespace,
    {},
  );
  const cleared = await ctx.runMutation(
    internal.listings.demoHotelSeed.clearAllDemoInventory,
    {},
  );
  const seeded = await ctx.runMutation(
    internal.listings.demoHotelSeed.upsertHotelDemoFarmersAndListings,
    {},
  );

  let syncedCount = 0;
  for (const listingId of seeded.listingIds) {
    await ctx.runAction(internal.listings.ragSync.syncListingToRag, {
      listingId,
    });
    syncedCount += 1;
  }

  return {
    deletedDrives: cleared.deletedDrives,
    deletedListings: cleared.deletedListings,
    deletedOrders: cleared.deletedOrders,
    deletedRagEntries: ragCleared.deletedEntries,
    farmerCount: seeded.farmerCount,
    listingCount: seeded.listingIds.length,
    storageFiles: cleared.storageFiles,
    syncedCount,
  };
}

const seedResultValidator = v.object({
  deletedDrives: v.number(),
  deletedListings: v.number(),
  deletedOrders: v.number(),
  deletedRagEntries: v.number(),
  farmerCount: v.number(),
  listingCount: v.number(),
  storageFiles: v.number(),
  syncedCount: v.number(),
});

export const seedHotelDemoInventoryInternal = internalAction({
  args: {},
  returns: seedResultValidator,
  handler: async (ctx) => {
    return await runHotelDemoSeed(ctx);
  },
});

/** Public entry for demo prep — gated behind DEMO_PAYMENTS like other demo tools. */
export const seedHotelDemoInventory = action({
  args: {},
  returns: seedResultValidator,
  handler: async (ctx) => {
    if (process.env.DEMO_PAYMENTS !== "true") {
      throw new Error(
        "Set DEMO_PAYMENTS=true to seed hotel demo inventory",
      );
    }

    return await runHotelDemoSeed(ctx);
  },
});
