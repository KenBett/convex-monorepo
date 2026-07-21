import { z } from "zod";

/** Kenyan MSISDN: 254 followed by 9 digits (typically 2547XXXXXXXX). */
const mpesaPhoneRegex = /^254[17]\d{8}$/;

export const orderFormSchema = z.object({
  quantityKg: z.coerce
    .number()
    .positive("Quantity must be a positive number"),
  mpesaPhoneNumber: z
    .string()
    .trim()
    .transform((value) => normalizeMpesaPhone(value))
    .pipe(
      z
        .string()
        .regex(
          mpesaPhoneRegex,
          "Enter a valid M-PESA number (e.g. 254712345678)",
        ),
    ),
});

export type OrderFormInput = z.infer<typeof orderFormSchema>;

export type OrderFormFieldErrors = Partial<
  Record<keyof OrderFormInput, string>
>;

export function normalizeMpesaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("254") && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }

  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    return `254${digits}`;
  }

  return digits;
}

export function parseOrderForm(
  input: Record<string, unknown>,
):
  | { success: true; data: OrderFormInput }
  | { success: false; errors: OrderFormFieldErrors } {
  const result = orderFormSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: OrderFormFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      errors[field as keyof OrderFormInput] === undefined
    ) {
      errors[field as keyof OrderFormInput] = issue.message;
    }
  }

  return { success: false, errors };
}

export type OrderCancelledReason =
  | "user_cancelled"
  | "timeout"
  | "phone_unreachable"
  | "payment_failed"
  | "insufficient_stock_at_escrow"
  | "buyer_cancelled";

export function formatOrderCancelledReason(reason: string | undefined): string {
  switch (reason) {
    case "user_cancelled":
      return "Payment was cancelled on your phone.";
    case "timeout":
      return "Payment timed out. Please try again.";
    case "phone_unreachable":
      return "M-PESA could not reach your phone. Check signal and try again.";
    case "payment_failed":
      return "Payment failed. Please check your M-PESA balance and try again.";
    case "insufficient_stock_at_escrow":
      return "This listing no longer had enough stock when payment completed.";
    case "buyer_cancelled":
      return "You cancelled the order before paying.";
    default:
      return "This order was cancelled.";
  }
}

export function formatOrderStatus(status: string): string {
  switch (status) {
    case "pending":
      return "Awaiting payment";
    case "escrowed":
      return "Paid — in escrow";
    case "delivered":
      return "Delivered";
    case "completed":
      return "Completed";
    case "disputed":
      return "Disputed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function formatDriveStatus(status: string): string {
  switch (status) {
    case "assigned":
      return "Drive assigned";
    case "picked_up":
      return "Picked up";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function calculateOrderTotal(
  quantityKg: number,
  pricePerKg: number,
): number {
  return Math.round(quantityKg * pricePerKg);
}
