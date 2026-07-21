import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { resolveDriveCoords } from "./driveCoords";

export type EscrowConfirmResult =
  | { kind: "escrowed"; orderId: Id<"orders"> }
  | { kind: "already_escrowed"; orderId: Id<"orders"> }
  | { kind: "cancelled"; orderId: Id<"orders">; reason: string }
  | { kind: "invalid_state"; orderId: Id<"orders">; status: Doc<"orders">["status"] };

/**
 * Decrements listing stock and marks the order escrowed.
 * Idempotent when the order is already escrowed.
 */
export async function confirmOrderEscrow(
  ctx: MutationCtx,
  order: Doc<"orders">,
  receiptNumber?: string,
): Promise<EscrowConfirmResult> {
  if (order.status === "escrowed") {
    return { kind: "already_escrowed", orderId: order._id };
  }

  if (order.status !== "pending") {
    return { kind: "invalid_state", orderId: order._id, status: order.status };
  }

  const listing = await ctx.db.get("listings", order.listingId);
  if (!listing) {
    await ctx.db.patch("orders", order._id, {
      cancelledReason: "payment_failed",
      status: "cancelled",
    });
    return { kind: "cancelled", orderId: order._id, reason: "payment_failed" };
  }

  if (listing.status !== "active" || listing.quantityKg < order.quantityKg) {
    await ctx.db.patch("orders", order._id, {
      cancelledReason: "insufficient_stock_at_escrow",
      status: "cancelled",
    });
    return {
      kind: "cancelled",
      orderId: order._id,
      reason: "insufficient_stock_at_escrow",
    };
  }

  const remainingQuantity = listing.quantityKg - order.quantityKg;
  const listingUpdates: {
    quantityKg: number;
    status?: "active" | "sold_out";
  } = {
    quantityKg: remainingQuantity,
  };

  if (remainingQuantity <= 0) {
    listingUpdates.status = "sold_out";
  }

  await ctx.db.patch("listings", order.listingId, listingUpdates);
  await ctx.db.patch("orders", order._id, {
    mpesaReceiptNumber: receiptNumber,
    status: "escrowed",
  });

  return { kind: "escrowed", orderId: order._id };
}

export async function findDemoDriverUserId(
  ctx: MutationCtx,
): Promise<Id<"users"> | null> {
  const drivers = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("role"), "driver"))
    .take(1);

  return drivers[0]?._id ?? null;
}

export async function createDriveForEscrowedOrder(
  ctx: MutationCtx,
  order: Doc<"orders">,
  assignedDriverUserId: Id<"users">,
): Promise<Id<"drives">> {
  const existing = await ctx.db
    .query("drives")
    .withIndex("by_order", (q) => q.eq("orderId", order._id))
    .unique();

  if (existing) {
    return existing._id;
  }

  const listing = await ctx.db.get("listings", order.listingId);
  const farmer = await ctx.db.get("farmerProfiles", order.farmerId);
  const buyer = await ctx.db.get("buyerProfiles", order.buyerId);

  const pointALabel = farmer?.cooperativeName ?? "Farm pickup";
  const pointBLabel =
    order.buyerBusinessName ?? buyer?.businessName ?? "Buyer drop-off";
  const countyA = listing?.county ?? farmer?.county ?? "—";
  const countyB = buyer?.county ?? order.county ?? "—";

  const pickup = resolveDriveCoords({
    county: countyA,
    locationLat: farmer?.locationLat,
    locationLng: farmer?.locationLng,
  });
  const dropoff = resolveDriveCoords({
    county: countyB,
    locationLat: buyer?.locationLat,
    locationLng: buyer?.locationLng,
  });

  return await ctx.db.insert("drives", {
    assignedDriverUserId,
    countyA,
    countyB,
    createdAt: Date.now(),
    crop: order.crop ?? listing?.crop ?? "produce",
    dropoffLat: dropoff.lat,
    dropoffLng: dropoff.lng,
    grade: listing?.grade,
    neededByLabel: order.neededByLabel,
    neededByMs: order.neededByMs,
    orderId: order._id,
    pickupLat: pickup.lat,
    pickupLng: pickup.lng,
    pointALabel,
    pointBLabel,
    quantityKg: order.quantityKg,
    status: "assigned",
  });
}
