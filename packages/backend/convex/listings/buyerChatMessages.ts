import type {
  BuyerOrderLineRequest,
  BuyerSearchIntent,
  BuyerSourcingStreamData,
  CropType,
} from "@repo/types";
import type { UIMessage } from "ai";

import { assertValidCrop } from "../lib/listings";
import { extractCropFromQuery } from "./buyerSearchIntentNormalize";

export type BuyerChatConversationTurn = {
  role: "assistant" | "user";
  text: string;
};

export type BuyerChatPreviousSourcingContext = {
  intent: BuyerSearchIntent;
  listings: BuyerSourcingStreamData["listings"];
};

export function getTextFromUiMessage(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function getLatestUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }

    const text = getTextFromUiMessage(message);
    if (text.length > 0) {
      return text;
    }
  }

  return "";
}

export function getConversationTurns(messages: UIMessage[]): BuyerChatConversationTurn[] {
  const turns: BuyerChatConversationTurn[] = [];

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") {
      continue;
    }

    const text = getTextFromUiMessage(message);
    if (text.length === 0) {
      continue;
    }

    turns.push({
      role: message.role,
      text,
    });
  }

  return turns;
}

export function buildConversationTranscript(
  turns: BuyerChatConversationTurn[],
  maxTurns = 8,
): string {
  return turns
    .slice(-maxTurns)
    .map((turn) => `${turn.role === "user" ? "Buyer" : "Assistant"}: ${turn.text}`)
    .join("\n");
}

function getSourcingDataFromMessage(
  message: UIMessage,
): BuyerSourcingStreamData | null {
  for (const part of message.parts) {
    if (part.type === "data-sourcing" && "data" in part) {
      return part.data as BuyerSourcingStreamData;
    }
  }

  return null;
}

export function getPreviousSourcingContext(
  messages: UIMessage[],
): BuyerChatPreviousSourcingContext | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") {
      continue;
    }

    const sourcing = getSourcingDataFromMessage(message);
    if (!sourcing || sourcing.listings.length === 0) {
      continue;
    }

    return {
      intent: sourcing.intent,
      listings: sourcing.listings,
    };
  }

  return null;
}

/** All listings shown in the chat, deduped by id (newest snapshot wins). */
export function collectConversationListings(
  messages: UIMessage[],
): BuyerSourcingStreamData["listings"] {
  const listingsById = new Map<
    string,
    BuyerSourcingStreamData["listings"][number]
  >();

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }

    const sourcing = getSourcingDataFromMessage(message);
    if (!sourcing) {
      continue;
    }

    for (const listing of sourcing.listings) {
      listingsById.set(listing.listingId, listing);
    }
  }

  return Array.from(listingsById.values());
}

export function buildBuyerChatRequestContext(messages: UIMessage[]): {
  conversationListings: BuyerSourcingStreamData["listings"];
  conversationTranscript: string;
  latestUserMessage: string;
  previousSourcing: BuyerChatPreviousSourcingContext | null;
} {
  const turns = getConversationTurns(messages);
  return {
    conversationListings: collectConversationListings(messages),
    conversationTranscript: buildConversationTranscript(turns),
    latestUserMessage: getLatestUserText(messages),
    previousSourcing: getPreviousSourcingContext(messages),
  };
}

const ORDER_INTENT_PATTERN =
  /\b(order|buy|purchase|get me|i want|i need)\b/i;

const PRONOUN_ORDER_PATTERN =
  /\b(?:order|buy|get)\s+(?:it|that|this)\b|\bi want(?:\s+to)?\s+(?:order|buy)\s+(?:it|that|this)\b/i;

/** True when the buyer message is trying to place an order, not browse new listings. */
export function userMessageHasOrderIntent(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length === 0 || !ORDER_INTENT_PATTERN.test(trimmed)) {
    return false;
  }

  return (
    /\d+\s*(?:kg|kilos?|kgs?)\b/i.test(trimmed) ||
    /\b(?:the )?(?:first|second|third|fourth|fifth)\b/i.test(trimmed) ||
    /\b(?:that|this|the)\s+one\b/i.test(trimmed) ||
    /\border\s+the\b/i.test(trimmed) ||
    PRONOUN_ORDER_PATTERN.test(trimmed)
  );
}

export function extractQuantityKgFromText(text: string): number | undefined {
  const match = text.match(/\b(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kgs?)\b/i);
  if (!match?.[1]) {
    return undefined;
  }

  const quantity = Number.parseFloat(match[1]);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : undefined;
}

/** Build order lines when the buyer confirms with pronouns after an earlier quantity request. */
export function inferFollowUpOrderLines(args: {
  conversationTranscript: string;
  previousListings: Array<{ crop: string }>;
  query: string;
}): BuyerOrderLineRequest[] | null {
  if (!userMessageHasOrderIntent(args.query)) {
    return null;
  }

  let quantityKg = extractQuantityKgFromText(args.query);
  if (quantityKg === undefined) {
    const buyerMessages = args.conversationTranscript
      .split("\n")
      .filter((line) => line.startsWith("Buyer:"))
      .map((line) => line.slice("Buyer:".length).trim());

    for (let index = buyerMessages.length - 1; index >= 0; index -= 1) {
      const fromPrior = extractQuantityKgFromText(buyerMessages[index] ?? "");
      if (fromPrior !== undefined) {
        quantityKg = fromPrior;
        break;
      }
    }
  }

  if (quantityKg === undefined) {
    return null;
  }

  const cropFromQuery = extractCropFromQuery(args.query);
  const cropFromTranscript = extractCropFromQuery(args.conversationTranscript);
  const singleListingCrop =
    args.previousListings.length === 1
      ? args.previousListings[0]?.crop
      : undefined;

  const crop = cropFromQuery ?? cropFromTranscript ?? singleListingCrop;
  if (!crop) {
    return null;
  }

  assertValidCrop(crop);

  const line: BuyerOrderLineRequest = {
    crop: crop as CropType,
    quantityKg,
  };

  if (args.previousListings.length === 1) {
    line.listingRef = 1;
  } else {
    const matchingIndexes = args.previousListings
      .map((listing, index) => (listing.crop === crop ? index : -1))
      .filter((index) => index >= 0);

    if (matchingIndexes.length === 1) {
      line.listingRef = matchingIndexes[0]! + 1;
    }
  }

  return [line];
}

/** Assistant message that directly replies to the latest non-empty user turn. */
export function getAssistantReplyToLatestUser(
  messages: UIMessage[],
): UIMessage | null {
  let lastUserIndex = -1;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") {
      continue;
    }

    if (getTextFromUiMessage(message).length > 0) {
      lastUserIndex = index;
      break;
    }
  }

  if (lastUserIndex === -1) {
    return null;
  }

  for (let index = lastUserIndex + 1; index < messages.length; index += 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      return message;
    }
  }

  return null;
}
