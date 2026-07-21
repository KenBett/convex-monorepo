import type {
  BuyerOrderDraft,
  BuyerOrderDraftLine,
  BuyerOrderLineRequest,
} from "@repo/types";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  assertValidCrop,
  matchesCooperative,
  matchesGrade,
} from "../lib/listings";
import { resolveNeededByMs } from "../lib/buyerNeededBy";
import {
  runListingSemanticSearch,
  type ListingSearchResultRow,
} from "./search";

export type BuyerChatPreviousListing = {
  certifications?: ListingSearchResultRow["certifications"];
  cooperativeName: string;
  county: string;
  crop: string;
  description?: string;
  grade?: string;
  harvestWindowLabel?: string;
  listingId: Id<"listings">;
  minOrderKg?: number;
  packaging?: ListingSearchResultRow["packaging"];
  packUnitKg?: number;
  pricePerKg: number;
  quantityKg: number;
  sizeOrCalibre?: string;
  status: "active" | "expired" | "sold_out";
  tags?: ListingSearchResultRow["tags"];
  variety?: string;
};

function toListingResult(row: ListingSearchResultRow) {
  return {
    certifications: row.certifications,
    cooperativeName: row.cooperativeName,
    county: row.county,
    crop: row.crop,
    description: row.description,
    grade: row.grade,
    harvestWindowLabel: row.harvestWindowLabel,
    imageUrl: row.imageUrl,
    listingId: row.listingId,
    minOrderKg: row.minOrderKg,
    packaging: row.packaging,
    packUnitKg: row.packUnitKg,
    pricePerKg: row.pricePerKg,
    quantityKg: row.quantityKg,
    score: row.score,
    sizeOrCalibre: row.sizeOrCalibre,
    snippet: row.snippet,
    status: row.status,
    tags: row.tags,
    title: row.title,
    variety: row.variety,
  };
}

function buildOrderSearchText(line: BuyerOrderLineRequest): string {
  const parts = [
    `${line.quantityKg} kg ${line.crop}`,
    line.cooperativeName,
    line.grade ? `grade ${line.grade}` : undefined,
    line.county ? `${line.county} county` : undefined,
  ].filter(Boolean);

  return parts.join(" ");
}

function validateResolvedListing(
  listing: ListingSearchResultRow,
  quantityKg: number,
  request: BuyerOrderLineRequest,
): BuyerOrderDraftLine {
  const base = {
    listing: toListingResult(listing),
    quantityKg,
    request,
  };

  if (listing.status !== "active") {
    return { ...base, issue: "not_active" };
  }

  if (listing.quantityKg < quantityKg) {
    return { ...base, issue: "insufficient_stock" };
  }

  return base;
}

function filterCandidatesByLine(
  candidates: ListingSearchResultRow[],
  line: BuyerOrderLineRequest,
): ListingSearchResultRow[] {
  return candidates.filter((candidate) => {
    if (candidate.crop !== line.crop) {
      return false;
    }
    if (line.county && candidate.county !== line.county) {
      return false;
    }
    if (!matchesCooperative(candidate.cooperativeName, line.cooperativeName)) {
      return false;
    }
    if (!matchesGrade(candidate.grade, line.grade)) {
      return false;
    }
    return true;
  });
}

async function hydratePreviousListing(
  ctx: ActionCtx,
  previous: BuyerChatPreviousListing,
): Promise<ListingSearchResultRow | null> {
  const hydrated = await ctx.runQuery(
    internal.listings.search.hydrateSearchCandidates,
    {
      candidates: [
        {
          listingId: previous.listingId,
          score: 1,
          snippet: `${previous.crop} listing`,
        },
      ],
      requiredCrop: previous.crop,
    },
  );

  return hydrated[0] ?? null;
}

async function resolveOrderLine(
  ctx: ActionCtx,
  line: BuyerOrderLineRequest,
  previousListings: BuyerChatPreviousListing[],
): Promise<BuyerOrderDraftLine> {
  assertValidCrop(line.crop);

  if (
    line.listingRef !== undefined &&
    line.listingRef >= 1 &&
    line.listingRef <= previousListings.length
  ) {
    const previous = previousListings[line.listingRef - 1];
    const hydrated = await hydratePreviousListing(ctx, previous);

    if (!hydrated) {
      return {
        quantityKg: line.quantityKg,
        issue: "not_found",
        request: line,
      };
    }

    return validateResolvedListing(hydrated, line.quantityKg, line);
  }

  const previousMatches = previousListings.filter(
    (previous) =>
      previous.crop === line.crop &&
      matchesCooperative(previous.cooperativeName, line.cooperativeName) &&
      matchesGrade(previous.grade, line.grade) &&
      (!line.county || previous.county === line.county),
  );

  if (previousMatches.length === 1) {
    const hydrated = await hydratePreviousListing(ctx, previousMatches[0]!);

    if (!hydrated) {
      return {
        quantityKg: line.quantityKg,
        issue: "not_found",
        request: line,
      };
    }

    return validateResolvedListing(hydrated, line.quantityKg, line);
  }

  const { results } = await runListingSemanticSearch(ctx, {
    crop: line.crop,
    limit: 8,
    query: buildOrderSearchText(line),
  });

  const candidates = filterCandidatesByLine(results, line);

  if (candidates.length === 0) {
    return {
      quantityKg: line.quantityKg,
      issue: "not_found",
      request: line,
    };
  }

  const sorted = [...candidates].sort((left, right) => right.score - left.score);
  const best = sorted[0]!;

  return validateResolvedListing(best, line.quantityKg, line);
}

function buildOrderDraftSummary(lines: BuyerOrderDraftLine[]): string {
  const resolvedCount = lines.filter((line) => !line.issue).length;
  const issueCount = lines.length - resolvedCount;

  if (resolvedCount === lines.length) {
    if (lines.length === 1) {
      return "I found a listing for your order — review the details below.";
    }

    return `I found ${resolvedCount} listings for your order — review the details below.`;
  }

  if (resolvedCount === 0) {
    return "I couldn't match your order to any in-stock listings. Adjust the request or try searching first.";
  }

  return `I matched ${resolvedCount} of ${lines.length} order lines. ${issueCount} line${issueCount === 1 ? " has" : "s have"} issues — review below.`;
}

export async function resolveOrderDraft(
  ctx: ActionCtx,
  lines: BuyerOrderLineRequest[],
  previousListings: BuyerChatPreviousListing[],
  options?: {
    neededByLabel?: string;
    neededByMs?: number;
    pointBLabel?: string;
  },
): Promise<BuyerOrderDraft> {
  const resolvedLines = await Promise.all(
    lines.map((line) => resolveOrderLine(ctx, line, previousListings)),
  );

  const firstResolved = resolvedLines.find((line) => line.listing)?.listing;
  const neededByLabel =
    options?.neededByLabel ??
    lines.map((line) => line.neededByLabel).find(Boolean);
  const neededByMs =
    options?.neededByMs ??
    (neededByLabel ? resolveNeededByMs(neededByLabel) : undefined);

  return {
    lines: resolvedLines,
    neededByLabel,
    neededByMs,
    pointALabel: firstResolved?.cooperativeName,
    pointBLabel: options?.pointBLabel,
    summaryText: buildOrderDraftSummary(resolvedLines),
  };
}
