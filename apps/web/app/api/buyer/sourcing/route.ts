import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { api } from "@repo/backend/convex/_generated/api";
import { buildBuyerChatRequestContext } from "@repo/backend/convex/listings/buyerChatMessages";
import {
  buildCompletedTrail,
  buildOptimisticTrail,
} from "@repo/backend/convex/listings/buyerChatTrail";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { fetchAction } from "convex/nextjs";

import { writeAssistantText } from "@/lib/buyer-chat-stream";

export const runtime = "nodejs";
export const maxDuration = 60;

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  return token.length > 0 ? token : null;
}

function mapListingForContext(listing: {
  certifications?: Array<
    "kepsa" | "globalgap" | "fairtrade" | "organic_certified"
  >;
  cooperativeName: string;
  county: string;
  crop: string;
  description?: string;
  grade?: string;
  harvestWindowLabel?: string;
  listingId: string;
  minOrderKg?: number;
  packaging?: "bulk" | "crates" | "gunny_bags" | "bags";
  packUnitKg?: number;
  pricePerKg: number;
  quantityKg: number;
  sizeOrCalibre?: string;
  status: "active" | "expired" | "sold_out";
  tags?: Array<
    | "organic"
    | "export_grade"
    | "washed"
    | "sorted"
    | "cold_chain"
    | "pesticide_free"
    | "irrigated"
    | "dried"
    | "fresh_picked"
    | "bulk_ready"
    | "sample_available"
    | "traceable"
    | "weekly_supply"
  >;
  variety?: string;
}) {
  return {
    certifications: listing.certifications,
    cooperativeName: listing.cooperativeName,
    county: listing.county,
    crop: listing.crop,
    description: listing.description,
    grade: listing.grade,
    harvestWindowLabel: listing.harvestWindowLabel,
    listingId: listing.listingId as Id<"listings">,
    minOrderKg: listing.minOrderKg,
    packaging: listing.packaging,
    packUnitKg: listing.packUnitKg,
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
    sizeOrCalibre: listing.sizeOrCalibre,
    status: listing.status,
    tags: listing.tags,
    variety: listing.variety,
  };
}

function toChatContextPayload(
  messages: UIMessage[],
  focusedListingId?: string,
) {
  const context = buildBuyerChatRequestContext(messages);

  const base: {
    conversationListings: ReturnType<typeof mapListingForContext>[];
    conversationTranscript: string;
    focusedListingId?: Id<"listings">;
    latestUserMessage: string;
  } = {
    conversationListings:
      context.conversationListings.map(mapListingForContext),
    conversationTranscript: context.conversationTranscript,
    latestUserMessage: context.latestUserMessage,
  };

  if (focusedListingId) {
    base.focusedListingId = focusedListingId as Id<"listings">;
  }

  if (!context.previousSourcing) {
    return base;
  }

  const crops = Array.from(
    new Set(context.previousSourcing.listings.map((listing) => listing.crop)),
  );

  return {
    ...base,
    previousSourcing: {
      crops,
      intent: context.previousSourcing.intent,
      listingCount: context.previousSourcing.listings.length,
      listings: context.previousSourcing.listings.map(mapListingForContext),
    },
  };
}

type StreamListingSource = {
  certifications?: string[];
  cooperativeName: string;
  county: string;
  crop: string;
  description: string;
  grade?: string;
  harvestWindowLabel?: string;
  imageUrl: string | null;
  listingId: string;
  minOrderKg?: number;
  packaging?: string;
  packUnitKg?: number;
  pricePerKg: number;
  quantityKg: number;
  score: number;
  sizeOrCalibre?: string;
  snippet: string;
  status: "active" | "expired" | "sold_out";
  tags?: string[];
  title?: string;
  variety?: string;
};

function toStreamListing(listing: StreamListingSource) {
  return {
    certifications: listing.certifications,
    cooperativeName: listing.cooperativeName,
    county: listing.county,
    crop: listing.crop,
    description: listing.description,
    grade: listing.grade,
    harvestWindowLabel: listing.harvestWindowLabel,
    imageUrl: listing.imageUrl,
    listingId: listing.listingId,
    minOrderKg: listing.minOrderKg,
    packaging: listing.packaging,
    packUnitKg: listing.packUnitKg,
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
    score: listing.score,
    sizeOrCalibre: listing.sizeOrCalibre,
    snippet: listing.snippet,
    status: listing.status,
    tags: listing.tags,
    title: listing.title,
    variety: listing.variety,
  };
}

function toStreamListings(results: StreamListingSource[]) {
  return results.map(toStreamListing);
}

function toStreamSearchGroups(
  searchGroups: Array<{
    intent: unknown;
    results: StreamListingSource[];
  }>,
) {
  return searchGroups.map((group) => ({
    intent: group.intent,
    listings: toStreamListings(group.results),
  }));
}

function toStreamOrderDraft(orderDraft: {
  lines: Array<{
    issue?: "ambiguous" | "insufficient_stock" | "not_active" | "not_found";
    listing?: StreamListingSource;
    quantityKg: number;
    request: {
      cooperativeName?: string;
      county?: string;
      crop: string;
      grade?: string;
      listingRef?: number;
      neededByLabel?: string;
      quantityKg: number;
    };
  }>;
  neededByLabel?: string;
  neededByMs?: number;
  pointALabel?: string;
  pointBLabel?: string;
  summaryText: string;
}) {
  return {
    lines: orderDraft.lines.map((line) => ({
      issue: line.issue,
      listing: line.listing ? toStreamListing(line.listing) : undefined,
      quantityKg: line.quantityKg,
      request: line.request,
    })),
    neededByLabel: orderDraft.neededByLabel,
    neededByMs: orderDraft.neededByMs,
    pointALabel: orderDraft.pointALabel,
    pointBLabel: orderDraft.pointBLabel,
    summaryText: orderDraft.summaryText,
  };
}

export async function POST(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: UIMessage[];
  let focusedListingId: string | undefined;

  try {
    const body = (await request.json()) as {
      focusedListingId?: string;
      messages?: UIMessage[];
    };

    messages = body.messages ?? [];
    focusedListingId =
      typeof body.focusedListingId === "string" &&
      body.focusedListingId.length > 0
        ? body.focusedListingId
        : undefined;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const chatContext = toChatContextPayload(messages, focusedListingId);

  if (chatContext.latestUserMessage.length === 0) {
    return new Response("Missing user message", { status: 400 });
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({
        type: "data-status",
        data: {
          phase: "working",
          trail: buildOptimisticTrail("working"),
        },
      });

      writer.write({
        type: "data-status",
        data: {
          phase: "searching",
          trail: buildOptimisticTrail("searching"),
        },
      });

      try {
        const turnResult = await fetchAction(
          api.listings.buyerSourcing.searchForBuyerChat,
          { chatContext },
          { token },
        );

        const hasSearchResults = turnResult.results.length > 0;
        const trail =
          turnResult.meta.trail ??
          buildCompletedTrail({
            filterLabels: turnResult.meta.filterLabels ?? [],
            ragCandidateCount: turnResult.meta.ragCandidateCount,
            resultCount: turnResult.meta.resultCount,
            retrievalMode: turnResult.meta.retrievalMode ?? "vector",
          });

        if (hasSearchResults || turnResult.meta.resultCount > 0) {
          writer.write({
            type: "data-status",
            data: {
              phase: "searching",
              trail,
            },
          });
        }

        if (hasSearchResults) {
          writer.write({
            type: "data-sourcing",
            data: {
              intent: turnResult.intent,
              listings: toStreamListings(turnResult.results),
              meta: {
                ...turnResult.meta,
                trail,
              },
              searchGroups: toStreamSearchGroups(turnResult.searchGroups),
            },
          });
        }

        if (turnResult.orderDraft) {
          writer.write({
            type: "data-status",
            data: {
              phase: "ordering",
              trail: buildOptimisticTrail("ordering"),
            },
          });
          writer.write({
            type: "data-order-draft",
            data: {
              orderDraft: toStreamOrderDraft(turnResult.orderDraft),
            },
          });
        }

        if (turnResult.assistantText) {
          writeAssistantText(writer, turnResult.assistantText);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Buyer sourcing search failed";

        console.error("buyer sourcing route failed", { error: message });
        throw error;
      }
    },
    originalMessages: messages,
  });

  try {
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Buyer sourcing search failed";

    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}
