import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { extractReceiptNumber, type StkCallbackPayload } from "./mpesaCallback";

export const mpesaStkWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: StkCallbackPayload;
  try {
    payload = (await request.json()) as StkCallbackPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const callback = payload.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) {
    console.error("M-PESA webhook: missing CheckoutRequestID", payload);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  const checkoutRequestId = callback.CheckoutRequestID;
  const resultCode = callback.ResultCode ?? -1;

  console.log("M-PESA webhook received", {
    checkoutRequestId,
    resultCode,
    resultDesc: callback.ResultDesc,
  });

  try {
    if (resultCode === 0) {
      const receiptNumber = extractReceiptNumber(callback);
      await ctx.runMutation(internal.orders.escrow.confirmEscrowInternal, {
        checkoutRequestId,
        receiptNumber,
      });
    } else if (resultCode === 1032) {
      await ctx.runMutation(internal.orders.escrow.failPaymentInternal, {
        checkoutRequestId,
        reason: "user_cancelled",
      });
    } else if (resultCode === 1037) {
      await ctx.runMutation(internal.orders.escrow.failPaymentInternal, {
        checkoutRequestId,
        reason: "phone_unreachable",
      });
    } else {
      await ctx.runMutation(internal.orders.escrow.failPaymentInternal, {
        checkoutRequestId,
        reason: "payment_failed",
      });
    }
  } catch (error) {
    console.error("M-PESA webhook processing error", {
      checkoutRequestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
