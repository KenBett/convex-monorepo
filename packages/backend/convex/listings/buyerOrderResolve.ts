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
import {
  runListingSemanticSearch,
  type ListingSearchResultRow,
} from "./search";

export type BuyerChatPreviousListing = {
  cooperativeName: string;
  county: string;
  crop: string;
  description?: string;
  grade?: string;
  listingId: Id<"listings">;
  pricePerKg: number;
  quantityKg: number;
  status: "active" | "expired" | "sold_out";
};

function toListingResult(row: ListingSearchResultRow) {
  return {
    cooperativeName: row.cooperativeName,
    county: row.county,
    crop: row.crop,
    description: row.description,
    grade: row.grade,
    imageUrl: row.imageUrl,
    listingId: row.listingId,
    pricePerKg: row.pricePerKg,
    quantityKg: row.quantityKg,
    score: row.score,
    snippet: row.snippet,
    status: row.status,
    title: row.title,
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
): Promise<BuyerOrderDraft> {
  const resolvedLines = await Promise.all(
    lines.map((line) => resolveOrderLine(ctx, line, previousListings)),
  );

  return {
    lines: resolvedLines,
    summaryText: buildOrderDraftSummary(resolvedLines),
  };
}
