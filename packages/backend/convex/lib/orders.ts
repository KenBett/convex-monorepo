import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireBuyerProfile, requireFarmerProfile } from "./listings";

export function assertOrderQuantityAvailable(
  listing: Pick<Doc<"listings">, "quantityKg" | "status">,
  requestedKg: number,
): void {
  if (listing.status !== "active") {
    throw new Error("This listing is no longer available");
  }

  if (!Number.isFinite(requestedKg) || requestedKg <= 0) {
    throw new Error("Quantity must be a positive number");
  }

  if (requestedKg > listing.quantityKg) {
    throw new Error(
      `Only ${listing.quantityKg} kg available (requested ${requestedKg} kg)`,
    );
  }
}

export function calculateOrderTotalKes(
  quantityKg: number,
  pricePerKg: number,
): number {
  return Math.round(quantityKg * pricePerKg);
}

export async function toOrderSummary(
  ctx: QueryCtx | MutationCtx,
  order: Doc<"orders">,
) {
  const listing = await ctx.db.get("listings", order.listingId);
  const buyer = await ctx.db.get("buyerProfiles", order.buyerId);

  if (!listing || !buyer) {
    throw new Error("Order references missing listing or buyer profile");
  }

  return {
    _creationTime: order._creationTime,
    _id: order._id,
    agreedPricePerKg: order.agreedPricePerKg,
    buyerBusinessName: buyer.businessName,
    cancelledReason: order.cancelledReason,
    county: listing.county,
    createdAt: order.createdAt,
    crop: listing.crop,
    farmerId: order.farmerId,
    listingId: order.listingId,
    mpesaCheckoutRequestId: order.mpesaCheckoutRequestId,
    mpesaPhoneNumber: order.mpesaPhoneNumber,
    mpesaReceiptNumber: order.mpesaReceiptNumber,
    quantityKg: order.quantityKg,
    status: order.status,
    totalKes: calculateOrderTotalKes(order.quantityKg, order.agreedPricePerKg),
  };
}

export async function requireOrderAccess(
  ctx: QueryCtx | MutationCtx,
  order: Doc<"orders">,
): Promise<"buyer" | "farmer"> {
  try {
    const buyerProfile = await requireBuyerProfile(ctx);
    if (order.buyerId === buyerProfile._id) {
      return "buyer";
    }
  } catch {
    // Not a buyer — try farmer.
  }

  const farmerProfile = await requireFarmerProfile(ctx);
  if (order.farmerId === farmerProfile._id) {
    return "farmer";
  }

  throw new Error("Unauthorized");
}

export { requireBuyerProfile, requireFarmerProfile };
