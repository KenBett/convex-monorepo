"use client";

import { useAuthToken } from "@convex-dev/auth/react";
import { api } from "@repo/backend/convex/_generated/api";
import type { BuyerSourcingListingResult, BuyerSourcingStreamData } from "@repo/types";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "convex/react";
import { Button, Card } from "@heroui/react";
import { DefaultChatTransport, isDataUIPart, type UIMessage } from "ai";
import { Bot, MessageSquarePlus, Send, ShoppingBag, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { BuyerListingCard } from "@/components/buyer/buyer-listing-card";
import { OrderCheckoutDialog } from "@/components/buyer/order-checkout-dialog";
import {
  clearBuyerSourcingMessages,
  loadBuyerSourcingMessages,
  saveBuyerSourcingMessages,
} from "@/lib/buyer-sourcing-chat-storage";
import { getBuyerSourcingIntroMessage } from "@/lib/buyer-sourcing-intro";

const BUYER_SOURCING_CHAT_API = "/api/buyer/sourcing";

const SURFACE_ELEVATION = "bg-surface shadow-sm dark:shadow-none";

const ELEVATED_SURFACE = `rounded-[0.875rem] ${SURFACE_ELEVATION} text-surface-foreground`;

const INPUT_SURFACE = `rounded-[0.875rem] border-0 ${SURFACE_ELEVATION} text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/30`;

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

function ChatMessage({
  message,
  onOrder,
}: {
  message: BuyerChatMessage;
  onOrder: (listing: BuyerSourcingListingResult) => void;
}) {
  const text = getMessageText(message);
  const sourcing = message.role === "assistant" ? getSourcingData(message) : null;
  const isUser = message.role === "user";
  const assistantIntro = sourcing ? getBuyerSourcingIntroMessage(sourcing) : text;

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div
          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${SURFACE_ELEVATION}`}
        >
          <Bot className="h-4 w-4 text-muted" strokeWidth={1.75} />
        </div>
      ) : null}

      <div
        className={`flex w-full max-w-[92%] flex-col gap-3 ${isUser ? "items-end" : "items-start"}`}
      >
        {isUser && text ? (
          <div className="rounded-[0.875rem] bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground shadow-sm dark:shadow-none">
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        ) : null}

        {!isUser && assistantIntro ? (
          <div className={`px-4 py-3 text-sm leading-6 ${ELEVATED_SURFACE}`}>
            <p>{assistantIntro}</p>
          </div>
        ) : null}

        {sourcing && sourcing.listings.length > 0 ? (
          <ol className="grid w-full grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-3">
            {sourcing.listings.map((listing) => (
              <li key={listing.listingId}>
                <BuyerListingCard onOrder={onOrder} result={listing} />
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {isUser ? (
        <div
          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${SURFACE_ELEVATION}`}
        >
          <UserRound className="h-4 w-4 text-muted" strokeWidth={1.75} />
        </div>
      ) : null}
    </div>
  );
}

function ChatLoadingIndicator() {
  return (
    <div aria-live="polite" className="flex justify-start gap-3" role="status">
      <div
        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${SURFACE_ELEVATION}`}
      >
        <Bot className="h-4 w-4 text-muted" strokeWidth={1.75} />
      </div>

      <div className={`px-4 py-3 ${ELEVATED_SURFACE}`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            {[0, 150, 300].map((delayMs) => (
              <span
                key={delayMs}
                className="h-2 w-2 animate-bounce rounded-full bg-muted"
                style={{ animationDelay: `${delayMs}ms` }}
              />
            ))}
          </span>
          <span className="text-sm text-muted">Searching live listings…</span>
        </div>
      </div>
    </div>
  );
}

export function BuyerSourcingChat() {
  const authToken = useAuthToken();
  const viewer = useQuery(api.users.viewer);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = authToken;

  const chatStorageKey = viewer?._id ?? null;
  const hasHydratedRef = useRef(false);

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

  const { clearError, error, messages, sendMessage, setMessages, status, stop } =
    useChat<BuyerChatMessage>({
      id: chatStorageKey ?? undefined,
      transport,
    });

  useEffect(() => {
    if (!chatStorageKey || hasHydratedRef.current) {
      return;
    }

    hasHydratedRef.current = true;
    const persistedMessages = loadBuyerSourcingMessages<BuyerChatMessage>(chatStorageKey);
    if (persistedMessages.length > 0) {
      setMessages(persistedMessages);
    }
  }, [chatStorageKey, setMessages]);

  useEffect(() => {
    if (!chatStorageKey || messages.length === 0) {
      return;
    }

    saveBuyerSourcingMessages(chatStorageKey, messages);
  }, [chatStorageKey, messages]);

  const [input, setInput] = useState("");
  const [checkoutListing, setCheckoutListing] =
    useState<BuyerSourcingListingResult | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutDefaultQty, setCheckoutDefaultQty] = useState<number | undefined>(
    undefined,
  );
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";
  const isAuthReady = authToken !== null;

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isBusy]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBusy || !isAuthReady) {
      return;
    }

    setInput("");
    await sendMessage({ text: trimmed });
  };

  const handleOrder = (listing: BuyerSourcingListingResult) => {
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    const intent = lastAssistant ? getSourcingData(lastAssistant)?.intent : null;
    setCheckoutDefaultQty(intent?.minQuantityKg);
    setCheckoutListing(listing);
    setCheckoutOpen(true);
  };

  const handleNewChat = () => {
    if (isBusy) {
      stop();
    }

    clearError();
    setMessages([]);
    setInput("");

    if (chatStorageKey) {
      clearBuyerSourcingMessages(chatStorageKey);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-muted" strokeWidth={1.75} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Find produce</h1>
            <p className="text-sm text-muted">
              Ask in plain language — results are verified against live stock.
            </p>
          </div>
        </div>

        {messages.length > 0 ? (
          <Button
            aria-label="Start a new chat"
            isDisabled={!isAuthReady}
            size="sm"
            type="button"
            variant="secondary"
            onPress={handleNewChat}
          >
            <MessageSquarePlus className="h-4 w-4" strokeWidth={1.75} />
            New chat
          </Button>
        ) : null}
      </div>

      <Card className="w-full rounded-card bg-surface text-surface-foreground shadow-sm dark:shadow-none">
        <Card.Content className="flex min-h-112 flex-col gap-4 px-5 py-5 sm:px-6">
          <div
            ref={chatScrollRef}
            className="flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            {messages.length === 0 ? (
              <div
                className={`flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center ${ELEVATED_SURFACE}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                  <Bot className="h-5 w-5 text-muted" strokeWidth={1.75} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium tracking-tight text-foreground">
                    Start a sourcing request
                  </p>
                  <p className="max-w-sm text-xs leading-relaxed text-muted">
                    Try &quot;50kg maize in Nakuru under 50 shillings per kg&quot;
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage key={message.id} message={message} onOrder={handleOrder} />
              ))
            )}

            {isBusy ? <ChatLoadingIndicator /> : null}
          </div>

          {error ? <p className="text-sm text-danger">{error.message}</p> : null}
          {!isAuthReady ? (
            <p className="text-sm text-muted">Signing you in…</p>
          ) : null}

          <form className="flex flex-col gap-3 pt-2" onSubmit={handleSubmit}>
            <textarea
              aria-label="Sourcing request"
              className={`min-h-24 w-full resize-none px-4 py-3 text-sm leading-6 transition-shadow duration-200 ${INPUT_SURFACE}`}
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

      <OrderCheckoutDialog
        defaultQuantityKg={checkoutDefaultQty}
        listing={checkoutListing}
        open={checkoutOpen}
        onClose={() => {
          setCheckoutOpen(false);
          setCheckoutListing(null);
        }}
      />
    </div>
  );
}
