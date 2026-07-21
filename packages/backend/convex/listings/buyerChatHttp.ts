import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { buildBuyerChatRequestContext } from "./buyerChatMessages";
import { writeAssistantText } from "./buyerChatStream";
import {
  buildCompletedTrail,
  buildOptimisticTrail,
} from "./buyerChatTrail";
import type { BuyerSourcingSearchResponse } from "./buyerSourcing";

function mapListingForContext(
  listing: {
    certifications?: BuyerSourcingSearchResponse["results"][number]["certifications"];
    cooperativeName: string;
    county: string;
    crop: string;
    description?: string;
    grade?: string;
    harvestWindowLabel?: string;
    listingId: Id<"listings">;
    minOrderKg?: number;
    packaging?: BuyerSourcingSearchResponse["results"][number]["packaging"];
    packUnitKg?: number;
    pricePerKg: number;
    quantityKg: number;
    sizeOrCalibre?: string;
    status: "active" | "expired" | "sold_out";
    tags?: BuyerSourcingSearchResponse["results"][number]["tags"];
    variety?: string;
  },
) {
  return {
    certifications: listing.certifications,
    cooperativeName: listing.cooperativeName,
    county: listing.county,
    crop: listing.crop,
    description: listing.description,
    grade: listing.grade,
    harvestWindowLabel: listing.harvestWindowLabel,
    listingId: listing.listingId,
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
  focusedListingId?: Id<"listings">,
) {
  const context = buildBuyerChatRequestContext(messages);

  const base: {
    conversationListings: ReturnType<typeof mapListingForContext>[];
    conversationTranscript: string;
    focusedListingId?: Id<"listings">;
    latestUserMessage: string;
  } = {
    conversationListings: context.conversationListings.map((listing) =>
      mapListingForContext({
        ...listing,
        listingId: listing.listingId as Id<"listings">,
      }),
    ),
    conversationTranscript: context.conversationTranscript,
    latestUserMessage: context.latestUserMessage,
  };

  if (focusedListingId) {
    base.focusedListingId = focusedListingId;
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
      listings: context.previousSourcing.listings.map((listing) =>
        mapListingForContext({
          ...listing,
          listingId: listing.listingId as Id<"listings">,
        }),
      ),
    },
  };
}

function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin ?? "*",
    Vary: "Origin",
  };
}

export const buyerSourcingChat = httpAction(async (ctx, request) => {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      headers: corsHeaders,
      status: 405,
    });
  }

  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response("Unauthorized", {
        headers: corsHeaders,
        status: 401,
      });
    }

    let messages: UIMessage[];
    let focusedListingId: Id<"listings"> | undefined;
    try {
      const body = (await request.json()) as {
        focusedListingId?: string;
        messages?: UIMessage[];
      };
      messages = body.messages ?? [];
      focusedListingId =
        typeof body.focusedListingId === "string" &&
        body.focusedListingId.length > 0
          ? (body.focusedListingId as Id<"listings">)
          : undefined;
    } catch {
      return new Response("Invalid request body", {
        headers: corsHeaders,
        status: 400,
      });
    }

    const chatContext = toChatContextPayload(messages, focusedListingId);
    if (chatContext.latestUserMessage.length === 0) {
      return new Response("Missing user message", {
        headers: corsHeaders,
        status: 400,
      });
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

        const turnResult: BuyerSourcingSearchResponse = await ctx.runAction(
          internal.listings.buyerSourcing.runBuyerSourcingSearch,
          { chatContext },
        );

        const trail =
          turnResult.meta.trail ??
          buildCompletedTrail({
            filterLabels: turnResult.meta.filterLabels ?? [],
            ragCandidateCount: turnResult.meta.ragCandidateCount,
            resultCount: turnResult.meta.resultCount,
            retrievalMode: turnResult.meta.retrievalMode ?? "vector",
          });

        if (turnResult.results.length > 0) {
          writer.write({
            type: "data-status",
            data: {
              phase: "searching",
              trail,
            },
          });

          writer.write({
            type: "data-sourcing",
            data: {
              intent: turnResult.intent,
              listings: turnResult.results.map((listing) => ({
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
              })),
              meta: {
                ...turnResult.meta,
                trail,
              },
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
              orderDraft: turnResult.orderDraft,
            },
          });
        }

        if (turnResult.assistantText) {
          writeAssistantText(writer, turnResult.assistantText);
        }
      },
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({
      headers: corsHeaders,
      stream,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Buyer sourcing search failed";
    console.error("buyerSourcingChat failed", { error: message });

    return new Response(JSON.stringify({ error: message }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 500,
    });
  }
});
