"use client";

import type {
  BuyerSourcingListingResult,
  ChatListingLiveStatus,
} from "@repo/types";

import {
  formatListingStatus,
  getBuyerListingDescription,
  getBuyerListingSnippet,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "@repo/types";
import { Button, Chip } from "@heroui/react";
import clsx from "clsx";
import Image from "next/image";
import { ShoppingBag, Store } from "lucide-react";
import { type KeyboardEvent } from "react";

import { CropBadge } from "@/components/farmer/crop-display";
import { ListingCardFace } from "@/components/listing/listing-card-face";

type BuyerListingCardProps = {
  /** Larger body type for zoomed chat cards — keeps outer card size unchanged. */
  emphasized?: boolean;
  forceLight?: boolean;
  liveStatus?: ChatListingLiveStatus;
  onOrder?: (result: BuyerSourcingListingResult) => void;
  onSelect?: (result: BuyerSourcingListingResult) => void;
  result: BuyerSourcingListingResult;
  /** When false, carousel owns scale feedback instead of hover grow. */
  scaleOnHover?: boolean;
};

function ListingCardNoiseOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{
        backgroundImage: `url("${LISTING_CARD_NOISE_DATA_URI}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
        opacity: LISTING_CARD_NOISE_OPACITY,
      }}
    />
  );
}

export function BuyerListingCard({
  emphasized = false,
  forceLight = false,
  liveStatus,
  onOrder,
  onSelect,
  result,
  scaleOnHover = true,
}: BuyerListingCardProps) {
  const theme = getCropTheme(result.crop);
  const resolvedStatus = liveStatus ?? result.status;
  const isUnavailable =
    resolvedStatus === "sold_out" ||
    resolvedStatus === "expired" ||
    resolvedStatus === "deleted";
  const isInteractive = Boolean(onSelect);
  const showInlineOrder =
    Boolean(onOrder) && !isInteractive && resolvedStatus === "active";

  const handleActivate = () => {
    if (isInteractive) {
      onSelect?.(result);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isInteractive) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(result);
    }
  };

  const matchSnippet = getBuyerListingSnippet(
    result.snippet,
    getBuyerListingDescription(result.description),
  );

  return (
    <article
      className={clsx(
        "relative flex flex-col overflow-hidden rounded-[0.875rem]",
        "shadow-sm transition-transform duration-200",
        getListingCardBgClass(result.crop),
        !scaleOnHover && "min-h-full",
        isUnavailable && "opacity-60 saturate-50",
        isInteractive && "cursor-pointer focus-visible:outline-none",
        isInteractive &&
          scaleOnHover &&
          "hover:scale-[1.03] active:scale-100 focus-visible:scale-[1.03]",
      )}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleActivate : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden">
        {result.imageUrl ? (
          <Image
            fill
            unoptimized
            alt={`${theme.label} listing photo`}
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 240px"
            src={result.imageUrl}
          />
        ) : (
          <div
            className={clsx(
              "flex h-full items-center justify-center bg-black/4",
              !forceLight && "dark:bg-black/20",
            )}
          >
            <CropBadge crop={result.crop} size="lg" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-black/20 to-transparent" />
        <div className="absolute right-2 top-2 z-10">
          {isUnavailable ? (
            <Chip
              className={clsx(
                "h-auto bg-white/95 shadow-sm ring-1 ring-black/5",
                emphasized ? "px-2 py-1" : "px-1.5 py-0.5",
                !forceLight && "dark:bg-stone-900/95",
              )}
              size="sm"
              variant="secondary"
            >
              <Chip.Label className={emphasized ? "text-xs" : "text-[10px]"}>
                {resolvedStatus === "deleted"
                  ? "No longer available"
                  : formatListingStatus(resolvedStatus)}
              </Chip.Label>
            </Chip>
          ) : result.score > 0 ? (
            <Chip
              className={clsx(
                "h-auto bg-white/95 shadow-sm ring-1 ring-black/5",
                emphasized ? "px-2 py-1" : "px-1.5 py-0.5",
                !forceLight && "dark:bg-stone-900/95",
              )}
              size="sm"
              variant="secondary"
            >
              <Chip.Label className={emphasized ? "text-xs" : "text-[10px]"}>
                {Math.round(result.score * 100)}% match
              </Chip.Label>
            </Chip>
          ) : null}
        </div>
      </div>

      {isUnavailable ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] bg-background/25"
        />
      ) : null}

      <ListingCardNoiseOverlay />

      <ListingCardFace
        className="pb-1.5"
        cropBadge={
          <CropBadge crop={result.crop} size={emphasized ? "md" : "sm"} />
        }
        cropLabel={theme.label}
        emphasized={emphasized}
        forceLight={forceLight}
        listing={result}
      />

      <div className="relative z-10 flex flex-col gap-1.5 px-2.5 pb-2.5">
        <Chip
          className={clsx(
            "h-auto max-w-full bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/15",
            emphasized ? "px-2 py-1" : "px-1.5 py-0.5",
            !forceLight && "dark:bg-emerald-950/50 dark:text-emerald-300",
          )}
          size="sm"
          variant="secondary"
        >
          <Chip.Label
            className={clsx(
              "inline-flex max-w-full items-center gap-1 truncate font-medium",
              emphasized ? "text-xs" : "text-[10px]",
            )}
          >
            <Store
              aria-hidden
              className={clsx(
                "shrink-0",
                emphasized ? "h-3.5 w-3.5" : "h-3 w-3",
              )}
              strokeWidth={1.75}
            />
            <span className="truncate">{result.cooperativeName}</span>
          </Chip.Label>
        </Chip>

        {/* Carousel owns height — omit snippet so live cards match skeleton frame. */}
        {matchSnippet && !isUnavailable && scaleOnHover ? (
          <p
            className={clsx(
              "italic text-neutral-600",
              emphasized
                ? "line-clamp-2 text-xs leading-snug"
                : "line-clamp-2 text-[10px] leading-snug",
              !forceLight && "dark:text-neutral-400",
            )}
          >
            {matchSnippet}
          </p>
        ) : null}

        {showInlineOrder ? (
          <Button
            className={clsx(
              "w-full rounded-full bg-accent font-semibold text-accent-foreground",
              emphasized ? "text-sm" : "text-[11px]",
            )}
            size="sm"
            variant="primary"
            onPress={() => onOrder?.(result)}
          >
            <ShoppingBag
              className={emphasized ? "h-4 w-4" : "h-3.5 w-3.5"}
              strokeWidth={1.75}
            />
            Order
          </Button>
        ) : null}
      </div>
    </article>
  );
}
