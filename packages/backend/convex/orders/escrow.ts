import { v } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import {
  confirmOrderEscrow,
  createDriveForEscrowedOrder,
  findDemoDriverUserId,
} from "../lib/fulfillment";

async function spawnDriveAfterEscrow(
  ctx: MutationCtx,
  order: Doc<"orders">,
): Promise<void> {
  const driverUserId = await findDemoDriverUserId(ctx);
  if (!driverUserId) {
    console.warn("No demo driver user — drive not created", {
      orderId: order._id,
    });
    return;
  }

  const refreshed = await ctx.db.get("orders", order._id);
  if (!refreshed || refreshed.status !== "escrowed") {
    return;
  }

  await createDriveForEscrowedOrder(ctx, refreshed, driverUserId);
}

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

    const result = await confirmOrderEscrow(ctx, order, args.receiptNumber);

    if (result.kind === "escrowed" || result.kind === "already_escrowed") {
      const current = await ctx.db.get("orders", result.orderId);
      if (current?.status === "escrowed") {
        await ctx.scheduler.runAfter(
          0,
          internal.listings.ragSync.syncListingToRag,
          { listingId: current.listingId },
        );
        await spawnDriveAfterEscrow(ctx, current);
      }
      return null;
    }

    if (result.kind === "invalid_state") {
      console.warn("M-PESA webhook: order not pending", {
        checkoutRequestId: args.checkoutRequestId,
        status: result.status,
      });
    }

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
