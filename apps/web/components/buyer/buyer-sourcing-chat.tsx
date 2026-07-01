"use client";

import type {
  BuyerChatStatusPhase,
  BuyerOrderDraft,
  BuyerOrderDraftStreamData,
  BuyerSourcingListingResult,
  BuyerSourcingStreamData,
  ChatListingLiveStatus,
} from "@repo/types";
import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { useAuthToken } from "@convex-dev/auth/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useChat } from "@ai-sdk/react";
import { getInitials } from "@repo/utils";
import { useQuery } from "convex/react";
import { Avatar, Button, Card } from "@heroui/react";
import { DefaultChatTransport, isDataUIPart, type UIMessage } from "ai";
import { ClipboardList, MessageSquarePlus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getAssistantReplyToLatestUser } from "@repo/backend/convex/listings/buyerChatMessages";

import { siteConfig } from "@/config/site";
import { BuyerListingCard } from "@/components/buyer/buyer-listing-card";
import { BuyerListingDetailDialog } from "@/components/buyer/buyer-listing-detail-dialog";
import { SourcingSendIcon } from "@/components/buyer/sourcing-agent-icon";
import { VunrLogo } from "@/components/marketing/vunr-logo";
import { SourcingChatEmptyState } from "@/components/buyer/sourcing-chat-empty-state";
import {
  OrderDraftConfirmDialog,
  type ConfirmedOrderLine,
} from "@/components/buyer/order-draft-confirm-dialog";
import { OrderCheckoutDialog } from "@/components/buyer/order-checkout-dialog";
import {
  clearBuyerSourcingMessages,
  loadBuyerSourcingMessages,
  saveBuyerSourcingMessages,
} from "@/lib/buyer-sourcing-chat-storage";
import {
  formatSearchGroupLabel,
  getBuyerOrderDraftIntroMessage,
  getBuyerSourcingIntroMessage,
} from "@/lib/buyer-sourcing-intro";

const BUYER_SOURCING_CHAT_API = "/api/buyer/sourcing";

const defaultAvatarInitials = siteConfig.name.slice(0, 2).toUpperCase();

const ASSISTANT_BUBBLE =
  "rounded-[0.875rem] bg-background text-foreground shadow-sm";

const COMPOSER_SURFACE =
  "rounded-[1.125rem] bg-background shadow-sm transition-shadow duration-200 focus-within:shadow-md";

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

const STATUS_MESSAGES_BY_PHASE: Record<BuyerChatStatusPhase, readonly string[]> =
  {
    working: [
      "Understanding what you need…",
      "Reading your request…",
      "Picking up the details…",
      "Checking what matters most…",
      "Matching your words to crops…",
      "Noting quantity and location…",
      "Figuring out grades and timing…",
      "Translating your ask into a search…",
      "Looking at county and delivery hints…",
      "Clarifying crop and grade preferences…",
      "Processing your message…",
      "Getting the context straight…",
      "Reviewing what you asked for…",
      "Sorting through your requirements…",
      "Connecting the dots on your order…",
      "Checking farmer listing categories…",
      "Aligning with what's in season…",
      "Thinking through the best approach…",
      "One moment while I interpret this…",
      "Turning your message into a plan…",
      "Considering price and quality tradeoffs…",
      "Mapping your needs to the marketplace…",
      "Working on your request…",
      "Almost ready to search…",
    ],
    searching: [
      "Searching listings…",
      "Scanning available produce…",
      "Comparing prices and grades…",
      "Narrowing down options…",
      "Browsing active farmer listings…",
      "Checking what's harvest-ready…",
      "Filtering by county and crop…",
      "Looking for the best value…",
      "Comparing unit prices…",
      "Checking stock levels…",
      "Finding matches near you…",
      "Ranking listings by fit…",
      "Scanning grade A and B options…",
      "Checking availability this week…",
      "Pulling fresh listings…",
      "Matching crop to your quantity…",
      "Reviewing farmer offers…",
      "Hunting for the right bundle…",
      "Weighing quality against price…",
      "Almost there with results…",
      "Shortlisting the strongest options…",
      "Cross-checking listing details…",
      "Finding the best matches…",
      "Checking farmer listings…",
    ],
    ordering: [
      "Preparing your order…",
      "Verifying availability…",
      "Calculating line totals…",
      "Almost ready to review…",
      "Building your draft order…",
      "Checking quantities against stock…",
      "Totalling up line items…",
      "Confirming prices haven't changed…",
      "Lining up delivery details…",
      "Validating each listing…",
      "Finalizing your cart…",
      "Double-checking units and amounts…",
      "Making sure everything still fits…",
      "Crunching the numbers…",
      "Pulling together your checkout…",
      "Reviewing order lines…",
      "Ensuring listings are still active…",
      "Getting your draft ready…",
      "One last pass on totals…",
      "Almost done assembling your order…",
      "Matching lines to live inventory…",
      "Checking minimum order quantities…",
      "Preparing your review summary…",
      "Wrapping up your order draft…",
    ],
  };

const STATUS_CYCLE_MS = 2000;

function pickRandomStatusMessage(
  messages: readonly string[],
  currentMessage: string | null,
): string {
  if (messages.length === 0) {
    return "";
  }

  if (messages.length === 1) {
    return messages[0] ?? "";
  }

  let nextMessage = messages[Math.floor(Math.random() * messages.length)] ?? "";

  while (nextMessage === currentMessage) {
    nextMessage = messages[Math.floor(Math.random() * messages.length)] ?? "";
  }

  return nextMessage;
}

function LoadingStatusText({ phase }: { phase: BuyerChatStatusPhase }) {
  const messages = STATUS_MESSAGES_BY_PHASE[phase];
  const [message, setMessage] = useState(() =>
    pickRandomStatusMessage(messages, null),
  );

  useEffect(() => {
    setMessage(pickRandomStatusMessage(messages, null));
  }, [phase, messages]);

  useEffect(() => {
    if (messages.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setMessage((currentMessage) =>
        pickRandomStatusMessage(messages, currentMessage),
      );
    }, STATUS_CYCLE_MS);

    return () => window.clearInterval(intervalId);
  }, [messages]);

  return (
    <span key={`${phase}-${message}`} className="loading-status-text-cycle text-sm text-muted">
      {message}
    </span>
  );
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

type VisibleSearchGroup = {
  key: string;
  label: string;
  listings: BuyerSourcingListingResult[];
};

/** Only meaningful when the buyer asked for more than one distinct crop/county/grade at once. */
function getVisibleSearchGroups(
  sourcing: BuyerSourcingStreamData,
  liveStatusMap: Map<string, ChatListingLiveStatus>,
): VisibleSearchGroup[] {
  if ((sourcing.searchGroups?.length ?? 0) <= 1) {
    return [];
  }

  return sourcing.searchGroups
    .map((group, index) => ({
      key: `${index}-${group.intent.crop ?? "group"}`,
      label: formatSearchGroupLabel(group),
      listings: group.listings.filter(
        (listing) => resolveLiveStatus(listing, liveStatusMap) !== "deleted",
      ),
    }))
    .filter((group) => group.listings.length > 0);
}

function LoadingBubble({ phase }: { phase: BuyerChatStatusPhase }) {
  return (
    <div className={`w-fit max-w-full px-4 py-3 ${ASSISTANT_BUBBLE}`}>
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
        <LoadingStatusText phase={phase} />
      </div>
    </div>
  );
}

function ChatMessage({
  message,
  liveStatusMap,
  loadingPhase,
  onOpenOrderDraft,
  onSelectListing,
  showLoading = false,
  userDisplayName,
  userImage,
  userInitials,
}: {
  message: BuyerChatMessage;
  liveStatusMap: Map<string, ChatListingLiveStatus>;
  loadingPhase?: BuyerChatStatusPhase;
  onOpenOrderDraft: (orderDraft: BuyerOrderDraft) => void;
  onSelectListing: (listing: BuyerSourcingListingResult) => void;
  showLoading?: boolean;
  userDisplayName: string;
  userImage?: string;
  userInitials: string;
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

  const visibleGroups = sourcing
    ? getVisibleSearchGroups(sourcing, liveStatusMap)
    : [];

  const hasVisibleContent =
    Boolean(assistantIntro) ||
    Boolean(orderDraftData) ||
    visibleListings.length > 0;

  const hasListingResults =
    visibleGroups.length > 0 || visibleListings.length > 0;

  const messageColumnClass = hasListingResults
    ? "flex min-w-0 w-full max-w-[92%] flex-col gap-3"
    : "flex min-w-0 max-w-[85%] flex-col gap-3 sm:max-w-[92%]";

  return (
    <div
      className={`flex w-full gap-2 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm dark:shadow-none">
          <VunrLogo className="h-4 w-4" size={16} />
        </div>
      ) : null}

      <div
        className={`${messageColumnClass} ${isUser ? "items-end" : "items-start"}`}
      >
        {isUser && text ? (
          <div className="w-fit max-w-full rounded-[0.875rem] bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground shadow-sm dark:shadow-none">
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        ) : null}

        {!isUser && showLoading && !hasVisibleContent && loadingPhase ? (
          <LoadingBubble phase={loadingPhase} />
        ) : null}

        {!isUser && assistantIntro ? (
          <div
            className={`w-fit max-w-full px-4 py-3 text-sm leading-6 ${ASSISTANT_BUBBLE}`}
          >
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

        {visibleGroups.length > 1 ? (
          <div className="flex w-full flex-col gap-4">
            {visibleGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <span className="w-fit rounded-full bg-default px-3 py-1 text-xs font-medium text-foreground/80">
                  {group.label}
                </span>
                <ol className="grid w-full grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-3">
                  {group.listings.map((listing) => (
                    <li key={listing.listingId}>
                      <BuyerListingCard
                        liveStatus={resolveLiveStatus(listing, liveStatusMap)}
                        result={listing}
                        onSelect={onSelectListing}
                      />
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : visibleListings.length > 0 ? (
          <ol className="grid w-full grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-3">
            {visibleListings.map((listing) => (
              <li key={listing.listingId}>
                <BuyerListingCard
                  liveStatus={resolveLiveStatus(listing, liveStatusMap)}
                  result={listing}
                  onSelect={onSelectListing}
                />
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {isUser ? (
        <Avatar className="mt-1 shrink-0 shadow-sm dark:shadow-none" size="sm">
          {userImage ? (
            <Avatar.Image
              alt={userDisplayName}
              referrerPolicy="no-referrer"
              src={userImage}
            />
          ) : null}
          <Avatar.Fallback>{userInitials}</Avatar.Fallback>
        </Avatar>
      ) : null}
    </div>
  );
}

function ChatLoadingIndicator({ phase }: { phase: BuyerChatStatusPhase }) {
  return (
    <div
      aria-live="polite"
      className="flex w-full justify-start gap-2 sm:gap-3"
      role="status"
    >
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm dark:shadow-none">
        <VunrLogo className="h-4 w-4" size={16} />
      </div>

      <LoadingBubble phase={phase} />
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
  const [selectedListing, setSelectedListing] =
    useState<BuyerSourcingListingResult | null>(null);
  const [listingDetailOpen, setListingDetailOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";
  const statusPhase = useMemo(
    () => (isBusy ? getStatusPhase(messages) : "working"),
    [isBusy, messages],
  );
  const isAuthReady = authToken !== null;
  const userDisplayName = viewer?.name ?? viewer?.email ?? "You";
  const userInitials = getInitials(
    viewer?.name,
    viewer?.email,
    defaultAvatarInitials,
  );

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

    const replyToLatestUser = getAssistantReplyToLatestUser(
      messages as UIMessage[],
    ) as BuyerChatMessage | null;

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

  const handleSelectListing = (listing: BuyerSourcingListingResult) => {
    setSelectedListing(listing);
    setListingDetailOpen(true);
  };

  const handleCloseListingDetail = () => {
    setListingDetailOpen(false);
    setSelectedListing(null);
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
      {messages.length > 0 ? (
        <div className="flex justify-end">
          <Button
            aria-label="Start a new chat"
            className="bg-background text-foreground shadow-sm hover:bg-surface-secondary dark:bg-surface dark:shadow-none dark:hover:bg-surface-secondary"
            isDisabled={!isAuthReady}
            size="sm"
            type="button"
            variant="ghost"
            onPress={handleNewChat}
          >
            <MessageSquarePlus className="h-4 w-4" strokeWidth={1.75} />
            New chat
          </Button>
        </div>
      ) : null}

      <Card className="w-full rounded-card bg-surface text-surface-foreground shadow-sm dark:shadow-none">
        <Card.Content
          className={`flex flex-col gap-4 px-5 py-5 sm:px-6${messages.length > 0 ? " min-h-112" : ""}`}
        >
          <div
            ref={chatScrollRef}
            className="flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            {messages.length === 0 ? (
              <SourcingChatEmptyState />
            ) : (
              messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  liveStatusMap={liveStatusMap}
                  loadingPhase={statusPhase}
                  message={message}
                  showLoading={
                    isBusy &&
                    index === messages.length - 1 &&
                    message.role === "assistant"
                  }
                  userDisplayName={userDisplayName}
                  userImage={viewer?.image}
                  userInitials={userInitials}
                  onOpenOrderDraft={handleOpenOrderDraft}
                  onSelectListing={handleSelectListing}
                />
              ))
            )}

            {isBusy &&
            (messages.length === 0 ||
              messages[messages.length - 1]?.role === "user") ? (
              <ChatLoadingIndicator phase={statusPhase} />
            ) : null}
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

      <BuyerListingDetailDialog
        listing={selectedListing}
        liveStatus={
          selectedListing
            ? resolveLiveStatus(selectedListing, liveStatusMap)
            : undefined
        }
        open={listingDetailOpen}
        onClose={handleCloseListingDetail}
        onOrder={handleOrder}
      />

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
