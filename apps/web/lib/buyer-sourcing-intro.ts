import type { BuyerSourcingStreamData } from "@repo/types";

export function getBuyerSourcingIntroMessage(
  sourcing: BuyerSourcingStreamData,
): string {
  const { listings, meta } = sourcing;
  const count = listings.length;

  if (count === 0) {
    return "No in-stock listings matched your request. Try adjusting the crop, county, quantity, or price.";
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
