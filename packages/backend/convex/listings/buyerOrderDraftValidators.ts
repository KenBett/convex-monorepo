import type { BuyerOrderDraft } from "@repo/types";
import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { listingSearchResultValidator } from "./search";

export const buyerOrderLineRequestValidator = v.object({
  cooperativeName: v.optional(v.string()),
  county: v.optional(v.string()),
  crop: v.string(),
  grade: v.optional(v.string()),
  listingRef: v.optional(v.number()),
  neededByLabel: v.optional(v.string()),
  quantityKg: v.number(),
});

export const buyerOrderDraftLineValidator = v.object({
  issue: v.optional(
    v.union(
      v.literal("ambiguous"),
      v.literal("insufficient_stock"),
      v.literal("not_active"),
      v.literal("not_found"),
    ),
  ),
  listing: v.optional(listingSearchResultValidator),
  quantityKg: v.number(),
  request: buyerOrderLineRequestValidator,
});

export const buyerOrderDraftValidator = v.object({
  lines: v.array(buyerOrderDraftLineValidator),
  neededByLabel: v.optional(v.string()),
  neededByMs: v.optional(v.number()),
  pointALabel: v.optional(v.string()),
  pointBLabel: v.optional(v.string()),
  summaryText: v.string(),
});

export function toValidatorOrderDraft(orderDraft: BuyerOrderDraft) {
  return {
    lines: orderDraft.lines.map((line) => ({
      issue: line.issue,
      listing: line.listing
        ? {
            certifications: line.listing.certifications,
            cooperativeName: line.listing.cooperativeName,
            county: line.listing.county,
            crop: line.listing.crop,
            description: line.listing.description,
            grade: line.listing.grade,
            harvestWindowLabel: line.listing.harvestWindowLabel,
            imageUrl: line.listing.imageUrl ?? null,
            listingId: line.listing.listingId as Id<"listings">,
            minOrderKg: line.listing.minOrderKg,
            packaging: line.listing.packaging,
            packUnitKg: line.listing.packUnitKg,
            pricePerKg: line.listing.pricePerKg,
            quantityKg: line.listing.quantityKg,
            score: line.listing.score,
            sizeOrCalibre: line.listing.sizeOrCalibre,
            snippet: line.listing.snippet,
            status: line.listing.status,
            tags: line.listing.tags,
            title: line.listing.title,
            variety: line.listing.variety,
          }
        : undefined,
      quantityKg: line.quantityKg,
      request: {
        cooperativeName: line.request.cooperativeName,
        county: line.request.county,
        crop: line.request.crop,
        grade: line.request.grade,
        listingRef: line.request.listingRef,
        neededByLabel: line.request.neededByLabel,
        quantityKg: line.request.quantityKg,
      },
    })),
    neededByLabel: orderDraft.neededByLabel,
    neededByMs: orderDraft.neededByMs,
    pointALabel: orderDraft.pointALabel,
    pointBLabel: orderDraft.pointBLabel,
    summaryText: orderDraft.summaryText,
  };
}
