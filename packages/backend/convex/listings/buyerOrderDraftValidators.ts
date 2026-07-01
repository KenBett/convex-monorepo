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
  summaryText: v.string(),
});

export function toValidatorOrderDraft(
  orderDraft: BuyerOrderDraft,
): {
  lines: Array<{
    issue?: "ambiguous" | "insufficient_stock" | "not_active" | "not_found";
    listing?: {
      cooperativeName: string;
      county: string;
      crop: string;
      description: string;
      grade?: string;
      imageUrl: string | null;
      listingId: Id<"listings">;
      pricePerKg: number;
      quantityKg: number;
      score: number;
      snippet: string;
      status: "active" | "expired" | "sold_out";
      title?: string;
    };
    quantityKg: number;
    request: {
      cooperativeName?: string;
      county?: string;
      crop: string;
      grade?: string;
      listingRef?: number;
      quantityKg: number;
    };
  }>;
  summaryText: string;
} {
  return {
    lines: orderDraft.lines.map((line) => ({
      issue: line.issue,
      listing: line.listing
        ? {
            cooperativeName: line.listing.cooperativeName,
            county: line.listing.county,
            crop: line.listing.crop,
            description: line.listing.description,
            grade: line.listing.grade,
            imageUrl: line.listing.imageUrl ?? null,
            listingId: line.listing.listingId as Id<"listings">,
            pricePerKg: line.listing.pricePerKg,
            quantityKg: line.listing.quantityKg,
            score: line.listing.score,
            snippet: line.listing.snippet,
            status: line.listing.status,
            title: line.listing.title,
          }
        : undefined,
      quantityKg: line.quantityKg,
      request: {
        cooperativeName: line.request.cooperativeName,
        county: line.request.county,
        crop: line.request.crop,
        grade: line.request.grade,
        listingRef: line.request.listingRef,
        quantityKg: line.request.quantityKg,
      },
    })),
    summaryText: orderDraft.summaryText,
  };
}
