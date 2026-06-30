import type { BuyerSourcingStreamData } from "@repo/types";

export function getBuyerSourcingIntroMessage(
  sourcing: BuyerSourcingStreamData,
): string {
  const { intent, listings, meta } = sourcing;
  const count = listings.length;

  if (count === 0) {
    if (intent.refinePreviousResults) {
      return "None of the earlier options still match that request. Try asking for beans again or adjust your filters.";
    }

    return "No in-stock listings matched your request. Try adjusting the crop, county, quantity, or price.";
  }

  if (intent.refinePreviousResults) {
    if (count === 1 && intent.pricePreference === "cheapest") {
      return "Here is the cheapest option from your previous results.";
    }
    if (count === 1 && intent.pricePreference === "most_expensive") {
      return "Here is the most expensive option from your previous results.";
    }
    if (count === 1) {
      return "Here is the option that best matches your follow-up.";
    }

    return `Here are ${count} refined options from your previous results.`;
  }

  const listingLabel = count === 1 ? "listing" : "listings";
  let message = `Here ${count === 1 ? "is" : "are"} ${count} matching ${listingLabel} below.`;

  if (meta.excludedSoldOutCount > 0) {
    const excludedLabel =
      meta.excludedSoldOutCount === 1 ? "listing was" : "listings were";

    message += ` ${meta.excludedSoldOutCount} sold-out ${excludedLabel} excluded from these results.`;
  }

  return message;
}
