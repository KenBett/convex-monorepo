import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import {
  assertOrderQuantityAvailable,
  requireBuyerProfile,
  requireFarmerProfile,
  requireOrderAccess,
  toOrderSummary,
} from "./lib/orders";

const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("escrowed"),
  v.literal("delivered"),
  v.literal("completed"),
  v.literal("disputed"),
  v.literal("cancelled"),
);

const orderSummaryValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("orders"),
  agreedPricePerKg: v.number(),
  buyerBusinessName: v.string(),
  cancelledReason: v.optional(v.string()),
  county: v.string(),
  createdAt: v.number(),
  crop: v.string(),
  farmerId: v.id("farmerProfiles"),
  listingId: v.id("listings"),
  mpesaCheckoutRequestId: v.optional(v.string()),
  mpesaPhoneNumber: v.optional(v.string()),
  mpesaReceiptNumber: v.optional(v.string()),
  quantityKg: v.number(),
  status: orderStatusValidator,
  totalKes: v.number(),
});

export const createOrder = mutation({
  args: {
    listingId: v.id("listings"),
    quantityKg: v.number(),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    const buyerProfile = await requireBuyerProfile(ctx);
    const listing = await ctx.db.get("listings", args.listingId);

    if (!listing) {
      throw new Error("Listing not found");
    }

    assertOrderQuantityAvailable(listing, args.quantityKg);

    return await ctx.db.insert("orders", {
      agreedPricePerKg: listing.pricePerKg,
      buyerBusinessName: buyerProfile.businessName,
      buyerId: buyerProfile._id,
      county: listing.county,
      createdAt: Date.now(),
      crop: listing.crop,
      farmerId: listing.farmerId,
      listingId: args.listingId,
      quantityKg: args.quantityKg,
      status: "pending",
    });
  },
});

export const getOrder = query({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.union(orderSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      return null;
    }

    try {
      await requireOrderAccess(ctx, order);
    } catch {
      return null;
    }

    return await toOrderSummary(ctx, order);
  },
});

export const ordersByBuyer = query({
  args: {},
  returns: v.array(orderSummaryValidator),
  handler: async (ctx) => {
    const buyerProfile = await requireBuyerProfile(ctx);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", buyerProfile._id))
      .order("desc")
      .collect();

    return await Promise.all(
      orders.map((order) => toOrderSummary(ctx, order)),
    );
  },
});

export const ordersByFarmer = query({
  args: {},
  returns: v.array(orderSummaryValidator),
  handler: async (ctx) => {
    const farmerProfile = await requireFarmerProfile(ctx);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_farmer", (q) => q.eq("farmerId", farmerProfile._id))
      .order("desc")
      .collect();

    return await Promise.all(
      orders.map((order) => toOrderSummary(ctx, order)),
    );
  },
});

export const markDelivered = mutation({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const farmerProfile = await requireFarmerProfile(ctx);
    const order = await ctx.db.get("orders", args.orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.farmerId !== farmerProfile._id) {
      throw new Error("Unauthorized");
    }

    if (order.status !== "escrowed") {
      throw new Error("Only escrowed orders can be marked delivered");
    }

    await ctx.db.patch("orders", args.orderId, { status: "delivered" });
    return null;
  },
});

export const cancelOrder = mutation({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const buyerProfile = await requireBuyerProfile(ctx);
    const order = await ctx.db.get("orders", args.orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.buyerId !== buyerProfile._id) {
      throw new Error("Unauthorized");
    }

    if (order.status !== "pending") {
      throw new Error("Only pending orders can be cancelled");
    }

    await ctx.db.patch("orders", args.orderId, {
      cancelledReason: "buyer_cancelled",
      status: "cancelled",
    });

    return null;
  },
});

export const getOrderForPayment = internalQuery({
  args: {
    orderId: v.id("orders"),
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("orders"),
      agreedPricePerKg: v.number(),
      buyerId: v.id("buyerProfiles"),
      quantityKg: v.number(),
      status: orderStatusValidator,
      totalKes: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const buyerProfile = await ctx.db
      .query("buyerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!buyerProfile) {
      return null;
    }

    const order = await ctx.db.get("orders", args.orderId);
    if (!order || order.buyerId !== buyerProfile._id) {
      return null;
    }

    if (order.status !== "pending") {
      return null;
    }

    return {
      _id: order._id,
      agreedPricePerKg: order.agreedPricePerKg,
      buyerId: order.buyerId,
      quantityKg: order.quantityKg,
      status: order.status,
      totalKes: Math.round(order.quantityKg * order.agreedPricePerKg),
    };
  },
});

export const attachStkPushDetails = internalMutation({
  args: {
    checkoutRequestId: v.string(),
    mpesaPhoneNumber: v.string(),
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order || order.status !== "pending") {
      throw new Error("Order is not pending");
    }

    await ctx.db.patch("orders", args.orderId, {
      mpesaCheckoutRequestId: args.checkoutRequestId,
      mpesaPhoneNumber: args.mpesaPhoneNumber,
    });

    return null;
  },
});

export const getOrderByCheckoutRequestId = internalQuery({
  args: {
    checkoutRequestId: v.string(),
  },
  returns: v.union(v.id("orders"), v.null()),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_checkout_request_id", (q) =>
        q.eq("mpesaCheckoutRequestId", args.checkoutRequestId),
      )
      .unique();

    return order?._id ?? null;
  },
});

export const getPendingOrderForExpiry = internalQuery({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.union(
    v.object({
      checkoutRequestId: v.optional(v.string()),
      status: orderStatusValidator,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      return null;
    }

    return {
      checkoutRequestId: order.mpesaCheckoutRequestId,
      status: order.status,
    };
  },
});

export type OrderDoc = Doc<"orders">;
