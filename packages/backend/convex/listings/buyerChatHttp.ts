import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";
import type { BuyerSearchIntent } from "./buyerChatParse";
import type { ListingSearchResultRow } from "./search";

function getLastUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }

    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();

    if (text.length > 0) {
      return text;
    }
  }

  return "";
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

    const query = getLastUserText(messages);
    if (query.length === 0) {
      return new Response("Missing user message", {
        headers: corsHeaders,
        status: 400,
      });
    }

    const searchResult: {
      intent: BuyerSearchIntent;
      meta: {
        excludedSoldOutCount: number;
        ragCandidateCount: number;
        resultCount: number;
      };
      results: ListingSearchResultRow[];
    } = await ctx.runAction(
      internal.listings.buyerSourcing.runBuyerSourcingSearch,
      { query },
    );

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({
          type: "data-sourcing",
          data: {
            intent: searchResult.intent,
            listings: searchResult.results.map((listing) => ({
              cooperativeName: listing.cooperativeName,
              county: listing.county,
              crop: listing.crop,
              description: listing.description,
              grade: listing.grade,
              listingId: listing.listingId,
              pricePerKg: listing.pricePerKg,
              quantityKg: listing.quantityKg,
              score: listing.score,
              snippet: listing.snippet,
              status: listing.status,
              title: listing.title,
            })),
            meta: searchResult.meta,
          },
        });
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
