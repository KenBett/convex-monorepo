import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { buildBuyerChatRequestContext } from "./buyerChatMessages";
import type { BuyerSearchIntent } from "./buyerChatParse";
import { writeAssistantText } from "./buyerChatStream";

function mapListingForContext(
  listing: {
    cooperativeName: string;
    county: string;
    crop: string;
    grade?: string;
    listingId: Id<"listings">;
    pricePerKg: number;
    quantityKg: number;
    status: "active" | "expired" | "sold_out";
  },
) {
  return {
    cooperativeName: listing.cooperativeName,
    county: listing.county,
    crop: listing.crop,
    grade: listing.grade,
    listingId: listing.listingId,
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
    status: listing.status,
  };
}

function toChatContextPayload(messages: UIMessage[]) {
  const context = buildBuyerChatRequestContext(messages);

  const base = {
    conversationListings: context.conversationListings.map((listing) =>
      mapListingForContext({
        ...listing,
        listingId: listing.listingId as Id<"listings">,
      }),
    ),
    conversationTranscript: context.conversationTranscript,
    latestUserMessage: context.latestUserMessage,
  };

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
    try {
      const body = (await request.json()) as { messages?: UIMessage[] };
      messages = body.messages ?? [];
    } catch {
      return new Response("Invalid request body", {
        headers: corsHeaders,
        status: 400,
      });
    }

    const chatContext = toChatContextPayload(messages);
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
          data: { phase: "working" },
        });

        const turnResult: {
          assistantText?: string;
          intent: BuyerSearchIntent;
          meta: {
            excludedSoldOutCount: number;
            ragCandidateCount: number;
            resultCount: number;
          };
          orderDraft?: {
            lines: Array<{
              issue?: "ambiguous" | "insufficient_stock" | "not_active" | "not_found";
              listing?: {
                cooperativeName: string;
                county: string;
                crop: string;
                description: string;
                grade?: string;
                imageUrl: string | null;
                listingId: string;
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
          };
          results: Array<{
            cooperativeName: string;
            county: string;
            crop: string;
            description: string;
            grade?: string;
            imageUrl: string | null;
            listingId: string;
            pricePerKg: number;
            quantityKg: number;
            score: number;
            snippet: string;
            status: "active" | "expired" | "sold_out";
            title?: string;
          }>;
        } = await ctx.runAction(
          internal.listings.buyerSourcing.runBuyerSourcingSearch,
          { chatContext },
        );

        if (turnResult.results.length > 0) {
          writer.write({
            type: "data-sourcing",
            data: {
              intent: turnResult.intent,
              listings: turnResult.results.map((listing) => ({
                cooperativeName: listing.cooperativeName,
                county: listing.county,
                crop: listing.crop,
                description: listing.description,
                grade: listing.grade,
                imageUrl: listing.imageUrl,
                listingId: listing.listingId,
                pricePerKg: listing.pricePerKg,
                quantityKg: listing.quantityKg,
                score: listing.score,
                snippet: listing.snippet,
                status: listing.status,
                title: listing.title,
              })),
              meta: turnResult.meta,
            },
          });
        }

        if (turnResult.orderDraft) {
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
