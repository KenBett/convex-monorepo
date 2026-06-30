import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

export const confirmEscrowInternal = internalMutation({
  args: {
    checkoutRequestId: v.string(),
    receiptNumber: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_checkout_request_id", (q) =>
        q.eq("mpesaCheckoutRequestId", args.checkoutRequestId),
      )
      .unique();

    if (!order) {
      console.error("M-PESA webhook: order not found", {
        checkoutRequestId: args.checkoutRequestId,
      });
      return null;
    }

    if (order.status === "escrowed") {
      return null;
    }

    if (order.status !== "pending") {
      console.warn("M-PESA webhook: order not pending", {
        checkoutRequestId: args.checkoutRequestId,
        status: order.status,
      });
      return null;
    }

    const listing = await ctx.db.get("listings", order.listingId);
    if (!listing) {
      await ctx.db.patch("orders", order._id, {
        cancelledReason: "payment_failed",
        status: "cancelled",
      });
      return null;
    }

    if (
      listing.status !== "active" ||
      listing.quantityKg < order.quantityKg
    ) {
      await ctx.db.patch("orders", order._id, {
        cancelledReason: "insufficient_stock_at_escrow",
        status: "cancelled",
      });
      return null;
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
      mpesaReceiptNumber: args.receiptNumber,
      status: "escrowed",
    });

    await ctx.scheduler.runAfter(0, internal.listings.ragSync.syncListingToRag, {
      listingId: order.listingId,
    });

    return null;
  },
});

export const failPaymentInternal = internalMutation({
  args: {
    checkoutRequestId: v.string(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_checkout_request_id", (q) =>
        q.eq("mpesaCheckoutRequestId", args.checkoutRequestId),
      )
      .unique();

    if (!order) {
      console.error("M-PESA fail: order not found", {
        checkoutRequestId: args.checkoutRequestId,
      });
      return null;
    }

    if (order.status !== "pending") {
      return null;
    }

    await ctx.db.patch("orders", order._id, {
      cancelledReason: args.reason,
      status: "cancelled",
    });

    return null;
  },
});

export const expirePendingOrder = internalMutation({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order || order.status !== "pending") {
      return null;
    }

    await ctx.db.patch("orders", args.orderId, {
      cancelledReason: "timeout",
      status: "cancelled",
    });

    return null;
  },
});
