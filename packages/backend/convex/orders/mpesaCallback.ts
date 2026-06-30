/** Safaricom STK callback payload shape (subset). */
export type StkCallbackPayload = {
  Body?: {
    stkCallback?: {
      CallbackMetadata?: {
        Item?: Array<{ Name?: string; Value?: string | number }>;
      };
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
    };
  };
};

export function extractReceiptNumber(
  callback: NonNullable<StkCallbackPayload["Body"]>["stkCallback"],
): string | undefined {
  const items = callback?.CallbackMetadata?.Item ?? [];
  for (const item of items) {
    if (item.Name === "MpesaReceiptNumber" && item.Value !== undefined) {
      return String(item.Value);
    }
  }
  return undefined;
}

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
