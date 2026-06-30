"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { initiateStkPush } from "./mpesaClient";
import { normalizeMpesaPhone } from "./mpesaCallback";

const STK_PUSH_EXPIRY_MS = 120_000;

export const initiateStkPushForOrder = action({
  args: {
    mpesaPhoneNumber: v.string(),
    orderId: v.id("orders"),
  },
  returns: v.object({
    checkoutRequestId: v.string(),
    customerMessage: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const phone = normalizeMpesaPhone(args.mpesaPhoneNumber);
    if (!/^254[17]\d{8}$/.test(phone)) {
      throw new Error("Enter a valid M-PESA number (e.g. 254712345678)");
    }

    const order = await ctx.runQuery(internal.orders.getOrderForPayment, {
      orderId: args.orderId,
      userId,
    });

    if (!order) {
      throw new Error("Order not found or not eligible for payment");
    }

    const stkResult = await initiateStkPush({
      accountReference: order._id,
      amount: order.totalKes,
      phone,
      transactionDesc: "Offtake order",
    });

    console.log("M-PESA STK push initiated", {
      amount: order.totalKes,
      checkoutRequestId: stkResult.CheckoutRequestID,
      customerMessage: stkResult.CustomerMessage,
      orderId: args.orderId,
      phone,
      responseCode: stkResult.ResponseCode,
      responseDescription: stkResult.ResponseDescription,
    });

    await ctx.runMutation(internal.orders.attachStkPushDetails, {
      checkoutRequestId: stkResult.CheckoutRequestID,
      mpesaPhoneNumber: phone,
      orderId: args.orderId,
    });

    await ctx.scheduler.runAfter(
      STK_PUSH_EXPIRY_MS,
      internal.orders.escrow.expirePendingOrder,
      { orderId: args.orderId },
    );

    return {
      checkoutRequestId: stkResult.CheckoutRequestID,
      customerMessage: stkResult.CustomerMessage,
    };
  },
});
