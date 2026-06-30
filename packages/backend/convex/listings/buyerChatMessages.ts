import type { BuyerSearchIntent, BuyerSourcingStreamData } from "@repo/types";
import type { UIMessage } from "ai";

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

export function buildBuyerChatRequestContext(messages: UIMessage[]): {
  conversationTranscript: string;
  latestUserMessage: string;
  previousSourcing: BuyerChatPreviousSourcingContext | null;
} {
  const turns = getConversationTurns(messages);
  return {
    conversationTranscript: buildConversationTranscript(turns),
    latestUserMessage: getLatestUserText(messages),
    previousSourcing: getPreviousSourcingContext(messages),
  };
}
