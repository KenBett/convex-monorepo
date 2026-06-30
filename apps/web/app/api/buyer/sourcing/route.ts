import { api } from "@repo/backend/convex/_generated/api";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { fetchAction } from "convex/nextjs";

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

function toStreamListings(
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
  }>,
) {
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

  const query = getLastUserText(messages);
  if (query.length === 0) {
    return new Response("Missing user message", { status: 400 });
  }

  try {
    const searchResult = await fetchAction(
      api.listings.buyerSourcing.searchForBuyerChat,
      { query },
      { token },
    );

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({
          type: "data-sourcing",
          data: {
            intent: searchResult.intent,
            listings: toStreamListings(searchResult.results),
            meta: searchResult.meta,
          },
        });
      },
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Buyer sourcing search failed";
    console.error("buyer sourcing route failed", { error: message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}
