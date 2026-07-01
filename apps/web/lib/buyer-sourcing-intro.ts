import type {
  BuyerOrderDraft,
  BuyerOrderDraftStreamData,
  BuyerSearchGroup,
  BuyerSourcingStreamData,
} from "@repo/types";

import { getCropTheme } from "@repo/types";

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Short chip label for a group header, e.g. "Tomatoes · Grade 2" or "Maize · Bungoma". */
export function formatSearchGroupLabel(group: BuyerSearchGroup): string {
  const { intent } = group;
  const cropLabel = intent.crop ? getCropTheme(intent.crop).label : "Produce";
  const parts = [cropLabel];

  if (intent.grade) {
    parts.push(`Grade ${intent.grade}`);
  }
  if (intent.county) {
    parts.push(intent.county);
  }

  return parts.join(" · ");
}

function describeSearchGroup(group: BuyerSearchGroup): string {
  const { intent, listings } = group;
  const count = listings.length;
  const cropLabel = intent.crop ? getCropTheme(intent.crop).label : "Produce";
  const gradeSuffix = intent.grade ? ` (Grade ${intent.grade})` : "";
  const countySuffix = intent.county ? ` from ${intent.county}` : "";
  const listingWord = count === 1 ? "listing" : "listings";

  return `${count} ${cropLabel}${gradeSuffix} ${listingWord}${countySuffix}`;
}

export function getBuyerSourcingIntroMessage(
  sourcing: BuyerSourcingStreamData,
): string {
  const { intent, listings, meta, searchGroups } = sourcing;
  const count = listings.length;

  if (count === 0) {
    if (intent.refinePreviousResults) {
      return "None of the earlier options still match that request. Try asking for beans again or adjust your filters.";
    }

    return "No in-stock listings matched your request. Try adjusting the crop, county, grade, quantity, or price.";
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

  if ((searchGroups?.length ?? 0) > 1) {
    const groupDescriptions = (searchGroups ?? [])
      .filter((group) => group.listings.length > 0)
      .map(describeSearchGroup);

    if (groupDescriptions.length > 1) {
      let message = `Found ${joinWithAnd(groupDescriptions)} below.`;

      if (meta.excludedSoldOutCount > 0) {
        const excludedLabel =
          meta.excludedSoldOutCount === 1 ? "listing was" : "listings were";

        message += ` ${meta.excludedSoldOutCount} sold-out ${excludedLabel} excluded from these results.`;
      }

      return message;
    }
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

export function getBuyerOrderDraftIntroMessage(
  data: BuyerOrderDraftStreamData,
): string {
  return data.orderDraft.summaryText;
}

export function formatOrderDraftIssue(
  issue: NonNullable<BuyerOrderDraft["lines"][number]["issue"]>,
): string {
  switch (issue) {
    case "insufficient_stock":
      return "Not enough stock available";
    case "not_active":
      return "Listing is no longer active";
    case "not_found":
      return "No matching listing found";
    case "ambiguous":
      return "Multiple listings matched — pick one from search results";
    default:
      return "Unable to fulfill this line";
  }
}
