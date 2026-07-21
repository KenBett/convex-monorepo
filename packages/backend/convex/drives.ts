import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { resolveDriveCoords } from "./lib/driveCoords";
import { getListingImageUrl } from "./lib/listingImages";
import { requireBuyerProfile } from "./lib/listings";
import { getCurrentUser, isDriverUser } from "./lib/roles";

const driveStatusValidator = v.union(
  v.literal("assigned"),
  v.literal("picked_up"),
  v.literal("delivered"),
  v.literal("cancelled"),
);

const driveSummaryValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("drives"),
  assignedDriverUserId: v.id("users"),
  countyA: v.string(),
  countyB: v.string(),
  createdAt: v.number(),
  crop: v.string(),
  deliveredAt: v.optional(v.number()),
  dropoffLat: v.union(v.number(), v.null()),
  dropoffLng: v.union(v.number(), v.null()),
  grade: v.optional(v.string()),
  imageUrl: v.union(v.string(), v.null()),
  neededByLabel: v.optional(v.string()),
  neededByMs: v.optional(v.number()),
  orderId: v.id("orders"),
  pickedUpAt: v.optional(v.number()),
  pickupLat: v.union(v.number(), v.null()),
  pickupLng: v.union(v.number(), v.null()),
  pointALabel: v.string(),
  pointBLabel: v.string(),
  quantityKg: v.number(),
  status: driveStatusValidator,
});

async function toDriveSummary(
  ctx: Parameters<typeof getListingImageUrl>[0],
  drive: Doc<"drives">,
) {
  const order = await ctx.db.get("orders", drive.orderId);
  const listing = order
    ? await ctx.db.get("listings", order.listingId)
    : null;
  const imageUrl = listing?.imageStorageId
    ? await getListingImageUrl(ctx, listing.imageStorageId)
    : null;

  let pickupLat = drive.pickupLat ?? null;
  let pickupLng = drive.pickupLng ?? null;
  let dropoffLat = drive.dropoffLat ?? null;
  let dropoffLng = drive.dropoffLng ?? null;

  if (
    pickupLat == null ||
    pickupLng == null ||
    dropoffLat == null ||
    dropoffLng == null
  ) {
    const farmer = order
      ? await ctx.db.get("farmerProfiles", order.farmerId)
      : null;
    const buyer = order
      ? await ctx.db.get("buyerProfiles", order.buyerId)
      : null;

    if (pickupLat == null || pickupLng == null) {
      const pickup = resolveDriveCoords({
        county: drive.countyA,
        locationLat: farmer?.locationLat,
        locationLng: farmer?.locationLng,
      });
      pickupLat = pickup.lat;
      pickupLng = pickup.lng;
    }

    if (dropoffLat == null || dropoffLng == null) {
      const dropoff = resolveDriveCoords({
        county: drive.countyB,
        locationLat: buyer?.locationLat,
        locationLng: buyer?.locationLng,
      });
      dropoffLat = dropoff.lat;
      dropoffLng = dropoff.lng;
    }
  }

  return {
    _creationTime: drive._creationTime,
    _id: drive._id,
    assignedDriverUserId: drive.assignedDriverUserId,
    countyA: drive.countyA,
    countyB: drive.countyB,
    createdAt: drive.createdAt,
    crop: drive.crop,
    deliveredAt: drive.deliveredAt,
    dropoffLat,
    dropoffLng,
    grade: drive.grade,
    imageUrl,
    neededByLabel: drive.neededByLabel,
    neededByMs: drive.neededByMs,
    orderId: drive.orderId,
    pickedUpAt: drive.pickedUpAt,
    pickupLat,
    pickupLng,
    pointALabel: drive.pointALabel,
    pointBLabel: drive.pointBLabel,
    quantityKg: drive.quantityKg,
    status: drive.status,
  };
}

async function requireDriverUser(ctx: Parameters<typeof getCurrentUser>[0]) {
  const user = await getCurrentUser(ctx);
  if (!isDriverUser(user)) {
    throw new Error("Driver access required");
  }
  return user;
}

export const listForDriver = query({
  args: {},
  returns: v.array(driveSummaryValidator),
  handler: async (ctx) => {
    const user = await requireDriverUser(ctx);

    const drives = await ctx.db
      .query("drives")
      .withIndex("by_driver", (q) => q.eq("assignedDriverUserId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(drives.map((drive) => toDriveSummary(ctx, drive)));
  },
});

export const listForBuyer = query({
  args: {},
  returns: v.array(driveSummaryValidator),
  handler: async (ctx) => {
    const buyerProfile = await requireBuyerProfile(ctx);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", buyerProfile._id))
      .collect();

    const orderIds = Array.from(new Set(orders.map((order) => order._id)));
    const drives: Doc<"drives">[] = [];

    for (const orderId of orderIds) {
      const drive = await ctx.db
        .query("drives")
        .withIndex("by_order", (q) => q.eq("orderId", orderId))
        .unique();
      if (drive) {
        drives.push(drive);
      }
    }

    drives.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(drives.map((drive) => toDriveSummary(ctx, drive)));
  },
});

export const getByOrder = query({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.union(driveSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    const drive = await ctx.db
      .query("drives")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .unique();

    if (!drive) {
      return null;
    }

    return await toDriveSummary(ctx, drive);
  },
});

export const markPickedUp = mutation({
  args: {
    driveId: v.id("drives"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireDriverUser(ctx);
    const drive = await ctx.db.get("drives", args.driveId);

    if (!drive) {
      throw new Error("Drive not found");
    }

    if (drive.assignedDriverUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (drive.status !== "assigned") {
      throw new Error("Only assigned drives can be picked up");
    }

    await ctx.db.patch("drives", args.driveId, {
      pickedUpAt: Date.now(),
      status: "picked_up",
    });

    return null;
  },
});

export const markDelivered = mutation({
  args: {
    driveId: v.id("drives"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireDriverUser(ctx);
    const drive = await ctx.db.get("drives", args.driveId);

    if (!drive) {
      throw new Error("Drive not found");
    }

    if (drive.assignedDriverUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (drive.status !== "picked_up") {
      throw new Error("Mark picked up before delivering");
    }

    const now = Date.now();
    await ctx.db.patch("drives", args.driveId, {
      deliveredAt: now,
      status: "delivered",
    });

    const order = await ctx.db.get("orders", drive.orderId);
    if (order && order.status === "escrowed") {
      await ctx.db.patch("orders", drive.orderId, { status: "delivered" });
    }

    return null;
  },
});

/** Hard-deletes a drive and its linked order (demo cleanup). */
export const deleteDrive = mutation({
  args: {
    driveId: v.id("drives"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireDriverUser(ctx);
    const drive = await ctx.db.get("drives", args.driveId);

    if (!drive) {
      throw new Error("Drive not found");
    }

    if (drive.assignedDriverUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    const orderId = drive.orderId;
    await ctx.db.delete("drives", args.driveId);

    const order = await ctx.db.get("orders", orderId);
    if (order) {
      await ctx.db.delete("orders", orderId);
    }

    return null;
  },
});
