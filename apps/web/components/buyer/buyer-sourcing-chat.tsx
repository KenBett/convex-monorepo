"use client";

import type {
  BuyerChatStatusPhase,
  BuyerOrderDraft,
  BuyerOrderDraftStreamData,
  BuyerSourcingListingResult,
  BuyerSourcingStreamData,
  ChatListingLiveStatus,
} from "@repo/types";

import { useAuthToken } from "@convex-dev/auth/react";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "convex/react";
import { Button, Card } from "@heroui/react";
import { DefaultChatTransport, isDataUIPart, type UIMessage } from "ai";
import {
  ClipboardList,
  MessageSquarePlus,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { BuyerListingCard } from "@/components/buyer/buyer-listing-card";
import {
  SourcingAgentIcon,
  SourcingSendIcon,
} from "@/components/buyer/sourcing-agent-icon";
import { SourcingChatEmptyState } from "@/components/buyer/sourcing-chat-empty-state";
import {
  OrderDraftConfirmDialog,
  type ConfirmedOrderLine,
} from "@/components/buyer/order-draft-confirm-dialog";
import { OrderCheckoutDialog } from "@/components/buyer/order-checkout-dialog";
import {
  getAssistantReplyToLatestUser,
} from "@repo/backend/convex/listings/buyerChatMessages";

import {
  clearBuyerSourcingMessages,
  loadBuyerSourcingMessages,
  saveBuyerSourcingMessages,
} from "@/lib/buyer-sourcing-chat-storage";
import {
  getBuyerOrderDraftIntroMessage,
  getBuyerSourcingIntroMessage,
} from "@/lib/buyer-sourcing-intro";

const BUYER_SOURCING_CHAT_API = "/api/buyer/sourcing";

const SURFACE_ELEVATION = "bg-surface shadow-sm dark:shadow-none";

const ELEVATED_SURFACE = `rounded-[0.875rem] ${SURFACE_ELEVATION} text-surface-foreground`;

const COMPOSER_SURFACE =
  "rounded-[1.125rem] border border-separator bg-background shadow-sm transition-shadow duration-200 focus-within:border-foreground/15 focus-within:shadow-md dark:shadow-none dark:focus-within:shadow-none";

const COMPOSER_INPUT =
  "min-h-20 w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm leading-6 text-foreground outline-none placeholder:text-muted";

type BuyerChatMessage = UIMessage<
  unknown,
  {
    "order-draft": BuyerOrderDraftStreamData;
    sourcing: BuyerSourcingStreamData;
    status: { phase: BuyerChatStatusPhase };
  }
>;

type CheckoutQueueItem = {
  listing: BuyerSourcingListingResult;
  quantityKg: number;
};

function getMessageText(message: BuyerChatMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function getSourcingData(
  message: BuyerChatMessage,
): BuyerSourcingStreamData | null {
  for (const part of message.parts) {
    if (isDataUIPart(part) && part.type === "data-sourcing") {
      return part.data;
    }
  }

  return null;
}

function getOrderDraftData(
  message: BuyerChatMessage,
): BuyerOrderDraftStreamData | null {
  for (const part of message.parts) {
    if (isDataUIPart(part) && part.type === "data-order-draft") {
      return part.data;
    }
  }

  return null;
}

function getStatusPhase(messages: BuyerChatMessage[]): BuyerChatStatusPhase {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  if (!lastAssistant) {
    return "working";
  }

  for (const part of lastAssistant.parts) {
    if (isDataUIPart(part) && part.type === "data-status") {
      return part.data.phase;
    }
  }

  return "working";
}

function formatStatusPhase(phase: BuyerChatStatusPhase): string {
  switch (phase) {
    case "searching":
      return "Searching listings…";
    case "ordering":
      return "Preparing your order…";
    default:
      return "Working on your request…";
  }
}

function collectChatListingIds(messages: BuyerChatMessage[]): Id<"listings">[] {
  const listingIds = new Set<Id<"listings">>();

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }

    const sourcing = getSourcingData(message);
    if (sourcing) {
      for (const listing of sourcing.listings) {
        listingIds.add(listing.listingId as Id<"listings">);
      }
    }

    const orderDraft = getOrderDraftData(message);
    if (orderDraft) {
      for (const line of orderDraft.orderDraft.lines) {
        if (line.listing) {
          listingIds.add(line.listing.listingId as Id<"listings">);
        }
      }
    }
  }

  return Array.from(listingIds).sort();
}

function buildLiveStatusMap(
  availability:
    | Array<{ listingId: Id<"listings">; status: ChatListingLiveStatus }>
    | undefined,
): Map<string, ChatListingLiveStatus> {
  const statusMap = new Map<string, ChatListingLiveStatus>();

  if (!availability) {
    return statusMap;
  }

  for (const entry of availability) {
    statusMap.set(entry.listingId, entry.status);
  }

  return statusMap;
}

function resolveLiveStatus(
  listing: BuyerSourcingListingResult,
  liveStatusMap: Map<string, ChatListingLiveStatus>,
): ChatListingLiveStatus {
  return liveStatusMap.get(listing.listingId) ?? listing.status;
}

function ChatMessage({
  message,
  liveStatusMap,
  onOpenOrderDraft,
  onOrder,
}: {
  message: BuyerChatMessage;
  liveStatusMap: Map<string, ChatListingLiveStatus>;
  onOpenOrderDraft: (orderDraft: BuyerOrderDraft) => void;
  onOrder: (listing: BuyerSourcingListingResult) => void;
}) {
  const text = getMessageText(message);
  const sourcing =
    message.role === "assistant" ? getSourcingData(message) : null;
  const orderDraftData =
    message.role === "assistant" ? getOrderDraftData(message) : null;
  const isUser = message.role === "user";

  const assistantIntro = orderDraftData
    ? getBuyerOrderDraftIntroMessage(orderDraftData)
    : sourcing
      ? getBuyerSourcingIntroMessage(sourcing)
      : text;

  const visibleListings =
    sourcing?.listings.filter(
      (listing) => resolveLiveStatus(listing, liveStatusMap) !== "deleted",
    ) ?? [];

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm dark:shadow-none">
          <SourcingAgentIcon className="h-4 w-4" size={16} />
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

        {!isUser && orderDraftData ? (
          <Button
            className="rounded-full"
            size="sm"
            type="button"
            variant="primary"
            onPress={() => onOpenOrderDraft(orderDraftData.orderDraft)}
          >
            <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
            Review order
          </Button>
        ) : null}

        {visibleListings.length > 0 ? (
          <ol className="grid w-full grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-3">
            {visibleListings.map((listing) => (
              <li key={listing.listingId}>
                <BuyerListingCard
                  liveStatus={resolveLiveStatus(listing, liveStatusMap)}
                  result={listing}
                  onOrder={onOrder}
                />
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

function ChatLoadingIndicator({ phase }: { phase: BuyerChatStatusPhase }) {
  return (
    <div aria-live="polite" className="flex justify-start gap-3" role="status">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm dark:shadow-none">
        <SourcingAgentIcon className="h-4 w-4" size={16} />
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
          <span className="text-sm text-muted">{formatStatusPhase(phase)}</span>
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
  const lastAutoOpenedDraftRef = useRef<string | null>(null);
  const dismissedDraftKeysRef = useRef<Set<string>>(new Set());

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

  const {
    clearError,
    error,
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat<BuyerChatMessage>({
    id: chatStorageKey ?? undefined,
    transport,
  });

  useEffect(() => {
    if (!chatStorageKey || hasHydratedRef.current) {
      return;
    }

    hasHydratedRef.current = true;
    const persistedMessages =
      loadBuyerSourcingMessages<BuyerChatMessage>(chatStorageKey);

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
  const [checkoutDefaultQty, setCheckoutDefaultQty] = useState<
    number | undefined
  >(undefined);
  const [checkoutQueue, setCheckoutQueue] = useState<CheckoutQueueItem[]>([]);
  const [checkoutStepIndex, setCheckoutStepIndex] = useState(0);
  const [orderDraftOpen, setOrderDraftOpen] = useState(false);
  const [activeOrderDraft, setActiveOrderDraft] =
    useState<BuyerOrderDraft | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";
  const statusPhase = useMemo(
    () => (isBusy ? getStatusPhase(messages) : "working"),
    [isBusy, messages],
  );
  const isAuthReady = authToken !== null;

  const chatListingIds = useMemo(
    () => collectChatListingIds(messages),
    [messages],
  );
  const liveAvailability = useQuery(
    api.listings.search.getChatListingAvailability,
    chatListingIds.length > 0 ? { listingIds: chatListingIds } : "skip",
  );
  const liveStatusMap = useMemo(
    () => buildLiveStatusMap(liveAvailability),
    [liveAvailability],
  );

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isBusy]);

  useEffect(() => {
    if (isBusy) {
      return;
    }

    const replyToLatestUser = getAssistantReplyToLatestUser(messages);

    if (!replyToLatestUser) {
      return;
    }

    const orderDraftData = getOrderDraftData(replyToLatestUser);
    if (!orderDraftData) {
      return;
    }

    const draftKey = `${replyToLatestUser.id}:${orderDraftData.orderDraft.lines.length}`;
    if (
      lastAutoOpenedDraftRef.current === draftKey ||
      dismissedDraftKeysRef.current.has(draftKey)
    ) {
      return;
    }

    lastAutoOpenedDraftRef.current = draftKey;
    setActiveOrderDraft(orderDraftData.orderDraft);
    setOrderDraftOpen(true);
  }, [isBusy, messages]);

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
    const liveStatus = resolveLiveStatus(listing, liveStatusMap);
    if (liveStatus !== "active") {
      return;
    }

    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    const intent = lastAssistant
      ? getSourcingData(lastAssistant)?.intent
      : null;

    setCheckoutQueue([]);
    setCheckoutStepIndex(0);
    setCheckoutDefaultQty(intent?.minQuantityKg);
    setCheckoutListing(listing);
    setCheckoutOpen(true);
  };

  const handleOpenOrderDraft = (orderDraft: BuyerOrderDraft) => {
    setActiveOrderDraft(orderDraft);
    setOrderDraftOpen(true);
  };

  const handleConfirmOrderDraft = (lines: ConfirmedOrderLine[]) => {
    if (lines.length === 0) {
      return;
    }

    setCheckoutQueue(lines);
    setCheckoutStepIndex(0);
    setCheckoutDefaultQty(lines[0]?.quantityKg);
    setCheckoutListing(lines[0]?.listing ?? null);
    setCheckoutOpen(true);
  };

  const handleCheckoutClose = () => {
    setCheckoutOpen(false);
    setCheckoutListing(null);
    setCheckoutQueue([]);
    setCheckoutStepIndex(0);
  };

  const handleCheckoutComplete = () => {
    setCheckoutOpen(false);
    setCheckoutListing(null);

    const nextIndex = checkoutStepIndex + 1;
    if (nextIndex < checkoutQueue.length) {
      const nextItem = checkoutQueue[nextIndex]!;
      setCheckoutStepIndex(nextIndex);
      setCheckoutDefaultQty(nextItem.quantityKg);
      setCheckoutListing(nextItem.listing);
      setCheckoutOpen(true);
      return;
    }

    setCheckoutQueue([]);
    setCheckoutStepIndex(0);
  };

  const checkoutStepLabel =
    checkoutQueue.length > 1
      ? `Payment ${checkoutStepIndex + 1} of ${checkoutQueue.length}`
      : undefined;

  const handleNewChat = () => {
    if (isBusy) {
      stop();
    }

    clearError();
    setMessages([]);
    setInput("");
    setCheckoutQueue([]);
    setCheckoutStepIndex(0);
    setActiveOrderDraft(null);
    setOrderDraftOpen(false);
    lastAutoOpenedDraftRef.current = null;
    dismissedDraftKeysRef.current = new Set();

    if (chatStorageKey) {
      clearBuyerSourcingMessages(chatStorageKey);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm dark:shadow-none">
            <SourcingAgentIcon className="h-5 w-5" size={20} />
          </div>
          <div>
            <p className="text-eyebrow">Buyer workspace</p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">
              Find produce
            </h1>
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
              <SourcingChatEmptyState
                onSelectPrompt={(prompt) => setInput(prompt)}
              />
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  liveStatusMap={liveStatusMap}
                  message={message}
                  onOpenOrderDraft={handleOpenOrderDraft}
                  onOrder={handleOrder}
                />
              ))
            )}

            {isBusy ? <ChatLoadingIndicator phase={statusPhase} /> : null}
          </div>

          {error ? (
            <p className="text-sm text-danger">{error.message}</p>
          ) : null}
          {!isAuthReady ? (
            <p className="text-sm text-muted">Signing you in…</p>
          ) : null}

          <form className="flex flex-col gap-3 pt-2" onSubmit={handleSubmit}>
            <div className={`relative ${COMPOSER_SURFACE}`}>
              <textarea
                aria-label="Sourcing request"
                className={COMPOSER_INPUT}
                placeholder="Describe what you need — crop, quantity, location, or cooperative…"
                rows={3}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !isBusy &&
                    isAuthReady &&
                    input.trim().length > 0
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                aria-label={isBusy ? "Working on request" : "Send request"}
                className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                disabled={isBusy || !isAuthReady || input.trim().length === 0}
                type="submit"
              >
                <SourcingSendIcon size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-xs text-muted">
                Press Enter to send · Shift+Enter for a new line
              </p>
              {isBusy ? (
                <Button
                  size="sm"
                  type="button"
                  variant="secondary"
                  onPress={() => stop()}
                >
                  Stop
                </Button>
              ) : null}
            </div>
          </form>
        </Card.Content>
      </Card>

      <OrderDraftConfirmDialog
        liveStatusMap={liveStatusMap}
        open={orderDraftOpen}
        orderDraft={activeOrderDraft}
        onClose={() => {
          if (lastAutoOpenedDraftRef.current) {
            dismissedDraftKeysRef.current.add(lastAutoOpenedDraftRef.current);
          }
          setOrderDraftOpen(false);
        }}
        onConfirm={handleConfirmOrderDraft}
      />

      <OrderCheckoutDialog
        defaultQuantityKg={checkoutDefaultQty}
        listing={checkoutListing}
        open={checkoutOpen}
        stepLabel={checkoutStepLabel}
        onCheckoutComplete={handleCheckoutComplete}
        onClose={handleCheckoutClose}
      />
    </div>
  );
}
