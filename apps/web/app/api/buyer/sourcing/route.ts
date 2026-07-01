import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { api } from "@repo/backend/convex/_generated/api";
import { buildBuyerChatRequestContext } from "@repo/backend/convex/listings/buyerChatMessages";
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
  cooperativeName: string;
  county: string;
  crop: string;
  description?: string;
  grade?: string;
  listingId: string;
  pricePerKg: number;
  quantityKg: number;
  status: "active" | "expired" | "sold_out";
}) {
  return {
    cooperativeName: listing.cooperativeName,
    county: listing.county,
    crop: listing.crop,
    description: listing.description,
    grade: listing.grade,
    listingId: listing.listingId as Id<"listings">,
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
    status: listing.status,
  };
}

function toChatContextPayload(messages: UIMessage[]) {
  const context = buildBuyerChatRequestContext(messages);

  const base = {
    conversationListings:
      context.conversationListings.map(mapListingForContext),
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
      listings: context.previousSourcing.listings.map(mapListingForContext),
    },
  };
}

type StreamListingSource = {
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

function toStreamListings(results: StreamListingSource[]) {
  return results.map((listing) => ({
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
  }));
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
}) {
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
            imageUrl: line.listing.imageUrl,
            listingId: line.listing.listingId,
            pricePerKg: line.listing.pricePerKg,
            quantityKg: line.listing.quantityKg,
            score: line.listing.score,
            snippet: line.listing.snippet,
            status: line.listing.status,
            title: line.listing.title,
          }
        : undefined,
      quantityKg: line.quantityKg,
      request: line.request,
    })),
    summaryText: orderDraft.summaryText,
  };
}

export async function POST(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: UIMessage[];

  try {
    const body = (await request.json()) as { messages?: UIMessage[] };

    messages = body.messages ?? [];
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const chatContext = toChatContextPayload(messages);

  if (chatContext.latestUserMessage.length === 0) {
    return new Response("Missing user message", { status: 400 });
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({
        type: "data-status",
        data: { phase: "working" },
      });

      try {
        const turnResult = await fetchAction(
          api.listings.buyerSourcing.searchForBuyerChat,
          { chatContext },
          { token },
        );

        const hasSearchResults = turnResult.results.length > 0;

        if (hasSearchResults) {
          writer.write({
            type: "data-sourcing",
            data: {
              intent: turnResult.intent,
              listings: toStreamListings(turnResult.results),
              meta: turnResult.meta,
              searchGroups: toStreamSearchGroups(turnResult.searchGroups),
            },
          });
        }

        if (turnResult.orderDraft) {
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
