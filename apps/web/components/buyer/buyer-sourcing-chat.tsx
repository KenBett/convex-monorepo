"use client";

import { useAuthToken } from "@convex-dev/auth/react";
import type { BuyerSourcingStreamData } from "@repo/types";
import { useChat } from "@ai-sdk/react";
import { Button, Card } from "@heroui/react";
import { DefaultChatTransport, isDataUIPart, type UIMessage } from "ai";
import { Bot, Send, ShoppingBag, UserRound } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";

import { BuyerListingCard } from "@/components/buyer/buyer-listing-card";
import { getBuyerSourcingIntroMessage } from "@/lib/buyer-sourcing-intro";

const BUYER_SOURCING_CHAT_API = "/api/buyer/sourcing";

type BuyerChatMessage = UIMessage<
  unknown,
  {
    sourcing: BuyerSourcingStreamData;
  }
>;

function getMessageText(message: BuyerChatMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function getSourcingData(message: BuyerChatMessage): BuyerSourcingStreamData | null {
  for (const part of message.parts) {
    if (isDataUIPart(part) && part.type === "data-sourcing") {
      return part.data;
    }
  }

  return null;
}

function ChatMessage({ message }: { message: BuyerChatMessage }) {
  const text = getMessageText(message);
  const sourcing = message.role === "assistant" ? getSourcingData(message) : null;
  const isUser = message.role === "user";
  const assistantIntro = sourcing ? getBuyerSourcingIntroMessage(sourcing) : text;

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-separator bg-surface">
          <Bot className="h-4 w-4 text-muted" strokeWidth={1.75} />
        </div>
      ) : null}

      <div
        className={`flex w-full max-w-[92%] flex-col gap-3 ${isUser ? "items-end" : "items-start"}`}
      >
        {isUser && text ? (
          <div className="rounded-[0.875rem] border border-separator bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground">
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        ) : null}

        {!isUser && assistantIntro ? (
          <div className="rounded-[0.875rem] border border-separator bg-surface px-4 py-3 text-sm leading-6 text-foreground">
            <p>{assistantIntro}</p>
          </div>
        ) : null}

        {sourcing && sourcing.listings.length > 0 ? (
          <ol className="grid w-full grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))] gap-3">
            {sourcing.listings.map((listing) => (
              <li key={listing.listingId}>
                <BuyerListingCard result={listing} />
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-separator bg-surface">
          <UserRound className="h-4 w-4 text-muted" strokeWidth={1.75} />
        </div>
      ) : null}
    </div>
  );
}

export function BuyerSourcingChat() {
  const authToken = useAuthToken();
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = authToken;

  const transport = useMemo(
    () =>
      new DefaultChatTransport<BuyerChatMessage>({
        api: BUYER_SOURCING_CHAT_API,
        headers: (): Record<string, string> => {
          const token = tokenRef.current;
          if (!token) {
            return {};
          }
          return { Authorization: `Bearer ${token}` };
        },
      }),
    [],
  );

  const { error, messages, sendMessage, status, stop } = useChat<BuyerChatMessage>({
    transport,
  });

  const [input, setInput] = useState("");
  const isBusy = status === "submitted" || status === "streaming";
  const isAuthReady = authToken !== null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBusy || !isAuthReady) {
      return;
    }

    setInput("");
    await sendMessage({ text: trimmed });
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-8 w-8 text-muted" strokeWidth={1.75} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Find produce</h1>
          <p className="text-sm text-muted">
            Ask in plain language — results are verified against live stock.
          </p>
        </div>
      </div>

      <Card className="w-full rounded-card bg-surface text-surface-foreground shadow-sm dark:shadow-none">
        <Card.Content className="flex min-h-112 flex-col gap-4 px-5 py-5 sm:px-6">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-card border border-separator px-6 py-10 text-center">
                <Bot className="h-6 w-6 text-muted" strokeWidth={1.75} />
                <p className="text-sm font-medium text-foreground">Start a sourcing request</p>
                <p className="max-w-sm text-xs text-muted">
                  Try &quot;50kg maize in Nakuru under 50 shillings per kg&quot;
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))
            )}
          </div>

          {error ? <p className="text-sm text-danger">{error.message}</p> : null}
          {!isAuthReady ? (
            <p className="text-sm text-muted">Signing you in…</p>
          ) : null}

          <form className="flex flex-col gap-3 border-t border-separator pt-4" onSubmit={handleSubmit}>
            <textarea
              aria-label="Sourcing request"
              className="min-h-24 w-full resize-y rounded-[0.875rem] border border-separator bg-surface px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g. 50kg maize in Nakuru under 50 shillings per kg"
              rows={3}
              value={input}
            />
            <div className="flex items-center gap-2">
              <Button
                className="rounded-full bg-accent px-5 font-medium text-accent-foreground focus-visible:outline-none focus-visible:opacity-80"
                isDisabled={isBusy || !isAuthReady || input.trim().length === 0}
                size="sm"
                type="submit"
                variant="primary"
              >
                <Send className="h-4 w-4" strokeWidth={1.75} />
                {isBusy ? "Searching…" : "Send"}
              </Button>
              {isBusy ? (
                <Button size="sm" type="button" variant="secondary" onPress={() => stop()}>
                  Stop
                </Button>
              ) : null}
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
