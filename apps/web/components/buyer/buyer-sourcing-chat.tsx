"use client";

import type {
  BuyerChatStatusPhase,
  BuyerChatTrailStep,
  BuyerOrderDraft,
  BuyerOrderDraftStreamData,
  BuyerSearchIntent,
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
import { Avatar, Button } from "@heroui/react";
import { DefaultChatTransport, isDataUIPart, type UIMessage } from "ai";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MessageSquarePlus,
} from "lucide-react";
import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getAssistantReplyToLatestUser } from "@repo/backend/convex/listings/buyerChatMessages";
import { resolveNeededByFromText } from "@repo/backend/convex/lib/buyerNeededBy";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { BuyerChatTrailStrip } from "@/components/buyer/buyer-chat-trail-strip";
import { BuyerListingCard } from "@/components/buyer/buyer-listing-card";
import { BuyerListingDetailDialog } from "@/components/buyer/buyer-listing-detail-dialog";
import { SourcingSendIcon } from "@/components/buyer/sourcing-agent-icon";
import { VunrLogo } from "@/components/marketing/vunr-logo";
import { SourcingChatEmptyState } from "@/components/buyer/sourcing-chat-empty-state";
import { OrderDraftConfirmDialog } from "@/components/buyer/order-draft-confirm-dialog";
import { OrderCheckoutDialog } from "@/components/buyer/order-checkout-dialog";
import { useNavbarPageActions } from "@/components/layout/navbar-actions-context";
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

const USER_BUBBLE =
  "rounded-[0.875rem] bg-background text-foreground shadow-sm dark:bg-surface dark:text-surface-foreground dark:shadow-none";

const COMPOSER_SURFACE =
  "rounded-[1.125rem] bg-background shadow-sm transition-shadow duration-200 focus-within:shadow-md dark:bg-surface dark:shadow-none dark:focus-within:shadow-none";

const COMPOSER_INPUT =
  "min-h-20 w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm leading-6 text-foreground outline-none placeholder:text-muted";

type BuyerChatMessage = UIMessage<
  unknown,
  {
    "order-draft": BuyerOrderDraftStreamData;
    sourcing: BuyerSourcingStreamData;
    status: { phase: BuyerChatStatusPhase; trail?: BuyerChatTrailStep[] };
  }
>;

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

type CheckoutFulfillment = {
  neededByLabel?: string;
  neededByMs?: number;
  pointALabel?: string;
  pointBLabel?: string;
};

/**
 * Card checkout skips the order-draft dialog, so recover needed-by / route
 * labels from the latest draft or recent user messages when available.
 */
function resolveCheckoutFulfillment(
  listing: BuyerSourcingListingResult,
  messages: BuyerChatMessage[],
  activeOrderDraft: BuyerOrderDraft | null,
): CheckoutFulfillment | undefined {
  const draftFromMessages = [...messages]
    .reverse()
    .map((message) => getOrderDraftData(message)?.orderDraft)
    .find((draft) => draft != null);
  const draft = activeOrderDraft ?? draftFromMessages ?? null;

  let neededByLabel = draft?.neededByLabel;
  let neededByMs = draft?.neededByMs;

  if (!neededByLabel || neededByMs === undefined) {
    for (const message of [...messages].reverse()) {
      if (message.role !== "user") {
        continue;
      }

      const resolved = resolveNeededByFromText(getMessageText(message));

      if (!resolved) {
        continue;
      }

      neededByLabel = neededByLabel ?? resolved.label;
      neededByMs = neededByMs ?? resolved.neededByMs;
      break;
    }
  }

  if (!neededByLabel && neededByMs === undefined) {
    return undefined;
  }

  return {
    neededByLabel,
    neededByMs,
    pointALabel: draft?.pointALabel ?? listing.cooperativeName,
    pointBLabel: draft?.pointBLabel,
  };
}

function getStatusPhase(messages: BuyerChatMessage[]): BuyerChatStatusPhase {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  if (!lastAssistant) {
    return "working";
  }

  // Multiple data-status parts are appended during a turn — use the latest.
  for (let index = lastAssistant.parts.length - 1; index >= 0; index -= 1) {
    const part = lastAssistant.parts[index];

    if (isDataUIPart(part) && part.type === "data-status") {
      return part.data.phase;
    }
  }

  return "working";
}

function getStatusTrail(
  message: BuyerChatMessage,
): BuyerChatTrailStep[] | null {
  const sourcing = getSourcingData(message);

  if (sourcing?.meta.trail && sourcing.meta.trail.length > 0) {
    return sourcing.meta.trail;
  }

  // Multiple data-status parts are appended during a turn — use the latest trail.
  for (let index = message.parts.length - 1; index >= 0; index -= 1) {
    const part = message.parts[index];

    if (
      isDataUIPart(part) &&
      part.type === "data-status" &&
      part.data.trail &&
      part.data.trail.length > 0
    ) {
      return part.data.trail;
    }
  }

  return null;
}

function getLatestStatusTrail(
  messages: BuyerChatMessage[],
): BuyerChatTrailStep[] | null {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  if (!lastAssistant) {
    return null;
  }

  return getStatusTrail(lastAssistant);
}

const LOADING_STATUS_MESSAGES: readonly string[] = [
  "Scanning co-op listings for a match…",
  "Checking what's in stock near your county…",
  "Sorting grades and quantities for you…",
  "Looking through fresh produce options…",
  "Matching your request to live inventory…",
  "Hunting down the right crop and volume…",
  "Comparing nearby farmer listings…",
  "Filtering sold-out lots out of the results…",
  "Narrowing in on what you asked for…",
  "Pulling up available produce now…",
  "Checking grades against your brief…",
  "Searching farms for open supply…",
  "Weighing quantity options that fit…",
  "Finding listings that match your ask…",
  "Cross-checking county and crop…",
  "Looking for the closest available lots…",
  "Gathering fresh options from farmers…",
  "Tracking down produce that fits your order…",
  "Reviewing live stock for a solid match…",
  "Almost there — lining up your best options…",
] as const;

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

function LoadingStatusText() {
  const [message, setMessage] = useState(() =>
    pickRandomStatusMessage(LOADING_STATUS_MESSAGES, null),
  );

  useEffect(() => {
    if (LOADING_STATUS_MESSAGES.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setMessage((currentMessage) =>
        pickRandomStatusMessage(LOADING_STATUS_MESSAGES, currentMessage),
      );
    }, STATUS_CYCLE_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <span
      key={message}
      className="loading-status-text-cycle text-sm text-muted"
    >
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
  const searchGroups = sourcing.searchGroups ?? [];

  if (searchGroups.length <= 1) {
    return [];
  }

  return searchGroups
    .map((group, index) => ({
      key: `${index}-${group.intent.crop ?? "group"}`,
      label: formatSearchGroupLabel(group),
      listings: group.listings.filter(
        (listing) => resolveLiveStatus(listing, liveStatusMap) !== "deleted",
      ),
    }))
    .filter((group) => group.listings.length > 0);
}

function getVisibleListings(
  sourcing: BuyerSourcingStreamData,
  liveStatusMap: Map<string, ChatListingLiveStatus>,
): BuyerSourcingListingResult[] {
  return sourcing.listings.filter(
    (listing) => resolveLiveStatus(listing, liveStatusMap) !== "deleted",
  );
}

/** Intrinsic listing-card width at 1× (keeps Where/Supply untruncated). */
const CHAT_LISTING_CARD_WIDTH_REM = 24;
/** Base display scale for carousel cards. */
const CHAT_LISTING_CARD_SCALE = 0.82;
/** Display width after zoom (used for CSS scroller padding). */
const CHAT_LISTING_CARD_DISPLAY_WIDTH_REM =
  CHAT_LISTING_CARD_WIDTH_REM * CHAT_LISTING_CARD_SCALE;
/**
 * Intrinsic min-height at 1× — image (16/10 of 24rem = 15rem) + reserved body
 * (emphasized face with 3-fact strip + one Quality row + coop chip, no snippet).
 */
const CHAT_LISTING_CARD_MIN_HEIGHT_REM = 26.5;
/** Carousel row slot: scaled focused card + scroller py-3. */
const CHAT_LISTING_CAROUSEL_SLOT_MIN_HEIGHT = `calc(${CHAT_LISTING_CARD_MIN_HEIGHT_REM * CHAT_LISTING_CARD_SCALE * 1.06}rem + 1.5rem)`;
/** Side pad so first/last cards center without a JS padding flash. */
const CHAT_LISTING_SCROLLER_PAD_STYLE = {
  paddingInline: `max(0px, calc((100% - ${CHAT_LISTING_CARD_DISPLAY_WIDTH_REM}rem) / 2))`,
} as const;
/** Snappy glide between cards (ms). */
const CHAT_LISTING_SCROLL_MS = 280;
/** Placeholder cards while a follow-up search is in flight — mirrors first live finding (focus + right peek). */
const CHAT_LISTING_SKELETON_COUNT = 2;
const CHAT_LISTING_SKELETON_FOCUS_INDEX = 0;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Ease: short glide, then a quick settle. */
function easeSlowThenSnap(t: number): number {
  if (t < 0.4) {
    const u = t / 0.4;

    return 0.22 * u * u;
  }

  const u = (t - 0.4) / 0.6;

  return 0.22 + 0.78 * (1 - Math.pow(1 - u, 3));
}

function animateElementScrollTo(
  scroller: HTMLElement,
  left: number,
  scrollAnimRef: { current: number | null },
  onDone?: () => void,
): void {
  if (scrollAnimRef.current !== null) {
    cancelAnimationFrame(scrollAnimRef.current);
    scrollAnimRef.current = null;
  }

  const finish = () => {
    scroller.style.scrollSnapType = "";
    onDone?.();
  };

  if (prefersReducedMotion()) {
    scroller.scrollLeft = left;
    finish();

    return;
  }

  const startLeft = scroller.scrollLeft;
  const delta = left - startLeft;

  if (Math.abs(delta) < 1) {
    finish();

    return;
  }

  scroller.style.scrollSnapType = "none";
  const startTime = performance.now();

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / CHAT_LISTING_SCROLL_MS);

    scroller.scrollLeft = startLeft + delta * easeSlowThenSnap(progress);

    if (progress < 1) {
      scrollAnimRef.current = requestAnimationFrame(step);

      return;
    }

    scrollAnimRef.current = null;
    scroller.scrollLeft = left;
    finish();
  };

  scrollAnimRef.current = requestAnimationFrame(step);
}

/** Request-time chat context (read by DefaultChatTransport, not during render). */
const buyerChatRequestContext = {
  authToken: null as string | null,
  focusedListingId: null as string | null,
};

function BuyerListingCardSkeleton() {
  return (
    <div
      aria-hidden
      className="w-full animate-pulse rounded-[0.875rem] bg-default shadow-sm dark:shadow-none"
      style={{ minHeight: `${CHAT_LISTING_CARD_MIN_HEIGHT_REM}rem` }}
    />
  );
}

function ChatListingCardFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="origin-top-left overflow-hidden"
      style={{
        width: `${CHAT_LISTING_CARD_WIDTH_REM}rem`,
        minHeight: `${CHAT_LISTING_CARD_MIN_HEIGHT_REM}rem`,
        zoom: CHAT_LISTING_CARD_SCALE,
      }}
    >
      {children}
    </div>
  );
}

/** Same carousel chrome as live results — keeps height while the agent searches. */
function ChatListingCarouselSkeleton() {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const focusedCardHalfRem =
    (CHAT_LISTING_CARD_DISPLAY_WIDTH_REM * 1.06) / 2;
  const arrowInset = `calc(50% - ${focusedCardHalfRem}rem - 0.2rem)`;

  const centerFocusedCard = () => {
    const scroller = scrollerRef.current;
    const focusedItem = scroller?.children[
      CHAT_LISTING_SKELETON_FOCUS_INDEX
    ] as HTMLElement | undefined;

    if (!scroller || !focusedItem) {
      return;
    }

    scroller.scrollLeft =
      focusedItem.offsetLeft -
      (scroller.clientWidth - focusedItem.offsetWidth) / 2;
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      centerFocusedCard();
    });

    const scroller = scrollerRef.current;

    if (!scroller || typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(frame);
    }

    const observer = new ResizeObserver(() => {
      centerFocusedCard();
    });

    observer.observe(scroller);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      aria-busy="true"
      aria-label="Searching for matching listings"
      className="relative w-full"
      role="status"
      style={{ minHeight: CHAT_LISTING_CAROUSEL_SLOT_MIN_HEIGHT }}
    >
      <ul
        ref={scrollerRef}
        className="chat-listing-carousel-scroller flex w-full gap-3 overflow-x-hidden overflow-y-visible py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={CHAT_LISTING_SCROLLER_PAD_STYLE}
      >
        {Array.from({ length: CHAT_LISTING_SKELETON_COUNT }, (_, index) => {
          const isActive = index === CHAT_LISTING_SKELETON_FOCUS_INDEX;

          return (
            <li
              key={index}
              className="chat-listing-carousel-snap shrink-0"
              style={{
                width: `${CHAT_LISTING_CARD_DISPLAY_WIDTH_REM}rem`,
              }}
            >
              <div
                className={clsx(
                  "chat-listing-carousel-card origin-center",
                  isActive
                    ? "z-[1] scale-[1.06] blur-none"
                    : "scale-[0.9] blur-[2.5px]",
                )}
              >
                <ChatListingCardFrame>
                  <BuyerListingCardSkeleton />
                </ChatListingCardFrame>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        aria-hidden
        className="pointer-events-none absolute top-1/2 z-10 flex h-8 w-8 translate-x-full -translate-y-1/2 items-center justify-center rounded-full bg-background text-foreground/50 shadow-sm"
        style={{ right: arrowInset }}
        tabIndex={-1}
        type="button"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function ChatListingCardCarousel({
  listings,
  liveStatusMap,
  onFocusedListingChange,
  onOrderListing,
  onSelectListing,
}: {
  listings: BuyerSourcingListingResult[];
  liveStatusMap: Map<string, ChatListingLiveStatus>;
  onFocusedListingChange?: (listing: BuyerSourcingListingResult | null) => void;
  onOrderListing: (listing: BuyerSourcingListingResult) => void;
  onSelectListing: (listing: BuyerSourcingListingResult) => void;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const scrollEndTimerRef = useRef<number | null>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const listingKey = listings.map((listing) => listing.listingId).join("|");
  const canGoPrev = listings.length > 1 && activeIndex > 0;
  const canGoNext = listings.length > 1 && activeIndex < listings.length - 1;
  const focusedListing = listings[activeIndex] ?? null;
  const focusedCardHalfRem =
    (CHAT_LISTING_CARD_DISPLAY_WIDTH_REM * 1.06) / 2;
  const arrowInset = `calc(50% - ${focusedCardHalfRem}rem - 0.2rem)`;

  activeIndexRef.current = activeIndex;

  const getCenteredScrollLeft = (index: number) => {
    const scroller = scrollerRef.current;
    const item = scroller?.children[index] as HTMLElement | undefined;

    if (!scroller || !item) {
      return 0;
    }

    return item.offsetLeft - (scroller.clientWidth - item.offsetWidth) / 2;
  };

  const getNearestIndex = () => {
    const scroller = scrollerRef.current;

    if (!scroller || listings.length === 0) {
      return 0;
    }

    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let bestIndex = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let index = 0; index < scroller.children.length; index += 1) {
      const item = scroller.children[index] as HTMLElement | undefined;

      if (!item) {
        continue;
      }

      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const dist = Math.abs(itemCenter - center);

      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = index;
      }
    }

    return Math.max(0, Math.min(bestIndex, listings.length - 1));
  };

  useEffect(() => {
    setActiveIndex(0);
    activeIndexRef.current = 0;
    if (scrollAnimRef.current !== null) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }
    requestAnimationFrame(() => {
      const scroller = scrollerRef.current;

      if (scroller) {
        scroller.scrollLeft = getCenteredScrollLeft(0);
      }
    });
  }, [listingKey]);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (scrollAnimRef.current !== null) {
        return;
      }

      scroller.scrollLeft = getCenteredScrollLeft(activeIndexRef.current);
    });

    observer.observe(scroller);

    return () => observer.disconnect();
  }, [listingKey]);

  useEffect(() => {
    onFocusedListingChange?.(focusedListing);
  }, [focusedListing, onFocusedListingChange]);

  useEffect(() => {
    return () => {
      if (scrollAnimRef.current !== null) {
        cancelAnimationFrame(scrollAnimRef.current);
      }
      if (scrollEndTimerRef.current !== null) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, []);

  const animateScrollTo = (left: number, onDone?: () => void) => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    animateElementScrollTo(scroller, left, scrollAnimRef, onDone);
  };

  const scrollToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(index, listings.length - 1));

    setActiveIndex(clamped);
    animateScrollTo(getCenteredScrollLeft(clamped));
  };

  const handleScrollerScroll = () => {
    if (scrollAnimRef.current !== null) {
      return;
    }

    const nearest = getNearestIndex();

    if (nearest !== activeIndex) {
      setActiveIndex(nearest);
    }

    if (scrollEndTimerRef.current !== null) {
      window.clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = window.setTimeout(() => {
      scrollEndTimerRef.current = null;
      if (scrollAnimRef.current !== null) {
        return;
      }

      const snapIndex = getNearestIndex();

      setActiveIndex(snapIndex);
      animateScrollTo(getCenteredScrollLeft(snapIndex));
    }, 70);
  };

  return (
    <div
      className="relative w-full"
      style={{ minHeight: CHAT_LISTING_CAROUSEL_SLOT_MIN_HEIGHT }}
    >
      <ul
        ref={scrollerRef}
        aria-label="Matching listings"
        className="chat-listing-carousel-scroller flex w-full gap-3 overflow-x-auto overflow-y-visible py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={CHAT_LISTING_SCROLLER_PAD_STYLE}
        onScroll={handleScrollerScroll}
      >
        {listings.map((listing, index) => {
          const isActive = index === activeIndex;

          return (
            <li
              key={listing.listingId}
              className="chat-listing-carousel-snap shrink-0"
              style={{
                width: `${CHAT_LISTING_CARD_DISPLAY_WIDTH_REM}rem`,
              }}
            >
              <div
                className={clsx(
                  "chat-listing-carousel-card origin-center",
                  isActive
                    ? "z-[1] scale-[1.06] blur-none"
                    : "scale-[0.9] blur-[2.5px]",
                )}
              >
                <ChatListingCardFrame>
                  <BuyerListingCard
                    emphasized
                    liveStatus={resolveLiveStatus(listing, liveStatusMap)}
                    result={listing}
                    scaleOnHover={false}
                    onOrder={onOrderListing}
                    onSelect={onSelectListing}
                  />
                </ChatListingCardFrame>
              </div>
            </li>
          );
        })}
      </ul>

      {canGoPrev ? (
        <button
          aria-label="Previous listing"
          className="absolute top-1/2 z-10 flex h-8 w-8 -translate-x-full -translate-y-1/2 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          style={{ left: arrowInset }}
          type="button"
          onClick={() => scrollToIndex(activeIndex - 1)}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : null}

      {canGoNext ? (
        <button
          aria-label="Next listing"
          className="absolute top-1/2 z-10 flex h-8 w-8 translate-x-full -translate-y-1/2 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          style={{ right: arrowInset }}
          type="button"
          onClick={() => scrollToIndex(activeIndex + 1)}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className={`w-fit max-w-full px-4 py-3 ${ASSISTANT_BUBBLE}`}>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex items-center gap-1">
          {[0, 150, 300].map((delayMs) => (
            <span
              key={delayMs}
              className="h-2 w-2 animate-bounce rounded-full bg-muted"
              style={{ animationDelay: `${delayMs}ms` }}
            />
          ))}
        </span>
        <LoadingStatusText />
      </div>
    </div>
  );
}

function ChatMessage({
  message,
  liveStatusMap,
  loadingPhase,
  onFocusedListingChange,
  onOpenOrderDraft,
  onOrderListing,
  onSelectListing,
  showLoading = false,
  userDisplayName,
  userImage,
  userInitials,
}: {
  message: BuyerChatMessage;
  liveStatusMap: Map<string, ChatListingLiveStatus>;
  loadingPhase?: BuyerChatStatusPhase;
  onFocusedListingChange?: (listing: BuyerSourcingListingResult | null) => void;
  onOpenOrderDraft: (orderDraft: BuyerOrderDraft) => void;
  onOrderListing: (listing: BuyerSourcingListingResult) => void;
  onSelectListing: (
    listing: BuyerSourcingListingResult,
    intent: BuyerSearchIntent | null,
  ) => void;
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
  const trail = message.role === "assistant" ? getStatusTrail(message) : null;
  const isUser = message.role === "user";
  const selectFromThisTurn = (listing: BuyerSourcingListingResult) => {
    onSelectListing(listing, sourcing?.intent ?? null);
  };

  const assistantIntro = orderDraftData
    ? getBuyerOrderDraftIntroMessage(orderDraftData)
    : sourcing
      ? getBuyerSourcingIntroMessage(sourcing)
      : text;

  const visibleListings = sourcing
    ? getVisibleListings(sourcing, liveStatusMap)
    : [];

  const visibleGroups = sourcing
    ? getVisibleSearchGroups(sourcing, liveStatusMap)
    : [];

  const hasVisibleContent =
    Boolean(assistantIntro) ||
    Boolean(orderDraftData) ||
    Boolean(trail) ||
    visibleListings.length > 0;

  const hasListingResults =
    visibleGroups.length > 0 || visibleListings.length > 0;
  const showResultsSkeleton = Boolean(showLoading && !hasListingResults);

  const messageColumnClass = isUser
    ? "flex min-w-0 w-full max-w-[50%] flex-col gap-3"
    : hasListingResults || showResultsSkeleton
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
          <div
            className={`w-fit max-w-full px-4 py-3 text-sm leading-6 ${USER_BUBBLE}`}
          >
            <p className="whitespace-pre-wrap break-words">{text}</p>
          </div>
        ) : null}

        {!isUser &&
        showLoading &&
        !hasVisibleContent &&
        !showResultsSkeleton &&
        loadingPhase ? (
          <LoadingBubble />
        ) : null}

        {!isUser &&
        trail &&
        trail.length > 0 &&
        (sourcing || showLoading || orderDraftData) ? (
          <BuyerChatTrailStrip className="w-full max-w-md" steps={trail} />
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

        {showResultsSkeleton ||
        visibleGroups.length > 1 ||
        visibleListings.length > 0 ? (
          <div
            className="relative w-full"
            style={{ minHeight: CHAT_LISTING_CAROUSEL_SLOT_MIN_HEIGHT }}
          >
            {showResultsSkeleton ? (
              <ChatListingCarouselSkeleton />
            ) : visibleGroups.length > 1 ? (
              <div className="flex w-full flex-col gap-4">
                {visibleGroups.map((group) => (
                  <div key={group.key} className="flex flex-col gap-2">
                    <span className="w-fit rounded-full bg-default px-3 py-1 text-xs font-medium text-foreground/80">
                      {group.label}
                    </span>
                    <ChatListingCardCarousel
                      listings={group.listings}
                      liveStatusMap={liveStatusMap}
                      onFocusedListingChange={onFocusedListingChange}
                      onOrderListing={onOrderListing}
                      onSelectListing={selectFromThisTurn}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <ChatListingCardCarousel
                listings={visibleListings}
                liveStatusMap={liveStatusMap}
                onFocusedListingChange={onFocusedListingChange}
                onOrderListing={onOrderListing}
                onSelectListing={selectFromThisTurn}
              />
            )}
          </div>
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

function ChatLoadingIndicator({
  trail,
}: {
  trail?: BuyerChatTrailStep[] | null;
}) {
  return (
    <div
      aria-live="polite"
      className="flex w-full justify-start gap-2 sm:gap-3"
      role="status"
    >
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm dark:shadow-none">
        <VunrLogo className="h-4 w-4" size={16} />
      </div>

      <div className="flex min-w-0 w-full max-w-[92%] flex-col gap-2">
        {trail && trail.length > 0 ? (
          <BuyerChatTrailStrip className="w-full max-w-md" steps={trail} />
        ) : (
          <LoadingBubble />
        )}
        <ChatListingCarouselSkeleton />
      </div>
    </div>
  );
}

export function BuyerSourcingChat() {
  const authToken = useAuthToken();
  const viewer = useQuery(api.users.viewer);

  useEffect(() => {
    buyerChatRequestContext.authToken = authToken;
  }, [authToken]);

  const chatStorageKey = viewer?._id ?? null;
  const hasHydratedRef = useRef(false);
  const hydratedMessageIdsRef = useRef(new Set<string>());
  const lastAutoOpenedDraftRef = useRef<string | null>(null);
  const dismissedDraftKeysRef = useRef(new Set<string>());

  const handleFocusedListingChange = useCallback(
    (listing: BuyerSourcingListingResult | null) => {
      buyerChatRequestContext.focusedListingId = listing?.listingId ?? null;
    },
    [],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport<BuyerChatMessage>({
        api: BUYER_SOURCING_CHAT_API,
        headers: (): Record<string, string> => {
          const token = buyerChatRequestContext.authToken;

          if (!token) {
            return {};
          }

          return { Authorization: `Bearer ${token}` };
        },
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...body,
            focusedListingId:
              buyerChatRequestContext.focusedListingId ?? undefined,
            messages,
          },
        }),
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
      hydratedMessageIdsRef.current = new Set(
        persistedMessages.map((message) => message.id),
      );
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
  const [checkoutFulfillment, setCheckoutFulfillment] = useState<
    CheckoutFulfillment | undefined
  >(undefined);
  const [orderDraftOpen, setOrderDraftOpen] = useState(false);
  const [detailListing, setDetailListing] =
    useState<BuyerSourcingListingResult | null>(null);
  const [detailIntent, setDetailIntent] = useState<BuyerSearchIntent | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeOrderDraft, setActiveOrderDraft] =
    useState<BuyerOrderDraft | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const isBusy = status === "submitted" || status === "streaming";
  const statusPhase = useMemo(
    () => (isBusy ? getStatusPhase(messages) : "working"),
    [isBusy, messages],
  );
  const statusTrail = useMemo(
    () => (isBusy ? getLatestStatusTrail(messages) : null),
    [isBusy, messages],
  );
  const isAuthReady = authToken !== null;
  const userDisplayName = viewer?.name ?? viewer?.email ?? "You";
  const userFirstName = (() => {
    const raw = viewer?.name?.trim().split(/\s+/)[0];

    if (!raw || raw === "You" || raw.includes("@")) {
      return undefined;
    }

    return raw;
  })();
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
  const latestSourcingMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];

      if (!message || message.role !== "assistant") {
        continue;
      }

      const sourcing = getSourcingData(message);

      if (
        sourcing &&
        (getVisibleSearchGroups(sourcing, liveStatusMap).length > 0 ||
          getVisibleListings(sourcing, liveStatusMap).length > 0)
      ) {
        return message.id;
      }
    }

    return null;
  }, [liveStatusMap, messages]);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const scroller = chatScrollRef.current;

    if (!scroller) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scroller.scrollTo({
          top: scroller.scrollHeight,
          behavior,
        });
      });
    });
  }, []);

  const handleChatScroll = () => {
    const scroller = chatScrollRef.current;

    if (!scroller) {
      return;
    }

    const distanceFromBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;

    stickToBottomRef.current = distanceFromBottom < 96;
  };

  useEffect(() => {
    if (!stickToBottomRef.current) {
      return;
    }

    scrollChatToBottom(isBusy ? "auto" : "smooth");
  }, [isBusy, messages, scrollChatToBottom]);

  // Auto-open only for drafts created in this session — never for messages
  // restored from storage on refresh / navigation.
  useEffect(() => {
    if (isBusy || !hasHydratedRef.current) {
      return;
    }

    const replyToLatestUser = getAssistantReplyToLatestUser(
      messages as UIMessage[],
    ) as BuyerChatMessage | null;

    if (!replyToLatestUser) {
      return;
    }

    if (hydratedMessageIdsRef.current.has(replyToLatestUser.id)) {
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

    stickToBottomRef.current = true;
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

    setCheckoutDefaultQty(intent?.minQuantityKg);
    setCheckoutFulfillment(
      resolveCheckoutFulfillment(listing, messages, activeOrderDraft),
    );
    setCheckoutListing(listing);
    setCheckoutOpen(true);
  };

  const handleSelectListing = (
    listing: BuyerSourcingListingResult,
    intent: BuyerSearchIntent | null,
  ) => {
    setDetailListing(listing);
    setDetailIntent(intent);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailListing(null);
    setDetailIntent(null);
  };

  const handleOrderFromDetail = (listing: BuyerSourcingListingResult) => {
    handleDetailClose();
    handleOrder(listing);
  };

  const handleOpenOrderDraft = (orderDraft: BuyerOrderDraft) => {
    setActiveOrderDraft(orderDraft);
    setOrderDraftOpen(true);
  };

  const handleCheckoutClose = () => {
    setCheckoutOpen(false);
    setCheckoutListing(null);
    setCheckoutFulfillment(undefined);
    setCheckoutDefaultQty(undefined);
  };

  const handleNewChat = useCallback(() => {
    if (isBusy) {
      stop();
    }

    clearError();
    setMessages([]);
    setInput("");
    setCheckoutListing(null);
    setCheckoutFulfillment(undefined);
    setCheckoutDefaultQty(undefined);
    setCheckoutOpen(false);
    setActiveOrderDraft(null);
    setOrderDraftOpen(false);
    setDetailOpen(false);
    setDetailListing(null);
    setDetailIntent(null);
    buyerChatRequestContext.focusedListingId = null;
    lastAutoOpenedDraftRef.current = null;
    dismissedDraftKeysRef.current = new Set();
    hydratedMessageIdsRef.current = new Set();

    if (chatStorageKey) {
      clearBuyerSourcingMessages(chatStorageKey);
    }
  }, [chatStorageKey, clearError, isBusy, setMessages, stop]);

  const newChatNavbarAction = useMemo(() => {
    if (messages.length === 0) {
      return null;
    }

    return (
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
    );
  }, [handleNewChat, isAuthReady, messages.length]);

  useNavbarPageActions(newChatNavbarAction);

  return (
    <div className="mx-auto flex h-[calc(100dvh-3rem-4rem-env(safe-area-inset-bottom)-0.75rem)] w-full max-w-4xl flex-col md:h-[calc(100dvh-3.5rem-2rem)]">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div
          ref={chatScrollRef}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={handleChatScroll}
        >
          {messages.length === 0 ? (
            <SourcingChatEmptyState firstName={userFirstName} />
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
                onFocusedListingChange={
                  message.id === latestSourcingMessageId
                    ? handleFocusedListingChange
                    : undefined
                }
                onOpenOrderDraft={handleOpenOrderDraft}
                onOrderListing={handleOrder}
                onSelectListing={handleSelectListing}
              />
            ))
          )}

          {isBusy &&
          (messages.length === 0 ||
            messages[messages.length - 1]?.role === "user") ? (
            <ChatLoadingIndicator trail={statusTrail} />
          ) : null}
        </div>

        {error ? <p className="shrink-0 text-sm text-danger">{error.message}</p> : null}
        {!isAuthReady ? (
          <p className="shrink-0 text-sm text-muted">Signing you in…</p>
        ) : null}

        <form className="flex shrink-0 flex-col gap-3" onSubmit={handleSubmit}>
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
          {isBusy ? (
            <div className="flex items-center justify-end gap-3 px-1">
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onPress={() => stop()}
              >
                Stop
              </Button>
            </div>
          ) : null}
        </form>
      </div>

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
        onComplete={() => {
          setOrderDraftOpen(false);
          setActiveOrderDraft(null);
        }}
      />

      <OrderCheckoutDialog
        defaultQuantityKg={checkoutDefaultQty}
        fulfillment={checkoutFulfillment}
        listing={checkoutListing}
        open={checkoutOpen}
        onCheckoutComplete={handleCheckoutClose}
        onClose={handleCheckoutClose}
      />

      <BuyerListingDetailDialog
        intent={detailIntent}
        listing={detailListing}
        liveStatus={
          detailListing
            ? resolveLiveStatus(detailListing, liveStatusMap)
            : undefined
        }
        open={detailOpen}
        onClose={handleDetailClose}
        onOrder={handleOrderFromDetail}
      />
    </div>
  );
}
