"use client";

import type {
  BuyerSourcingListingResult,
  ChatListingLiveStatus,
} from "@repo/types";

import {
  formatListingStatus,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "@repo/types";
import { Button, Chip } from "@heroui/react";
import clsx from "clsx";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { type KeyboardEvent } from "react";

import { CropBadge } from "@/components/farmer/crop-display";

type BuyerListingCardProps = {
  forceLight?: boolean;
  liveStatus?: ChatListingLiveStatus;
  onOrder?: (result: BuyerSourcingListingResult) => void;
  onSelect?: (result: BuyerSourcingListingResult) => void;
  result: BuyerSourcingListingResult;
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
  forceLight = false,
  liveStatus,
  onOrder,
  onSelect,
  result,
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

  return (
    <article
      className={clsx(
        "group relative grid aspect-square grid-rows-[1fr_auto] overflow-hidden rounded-[0.875rem]",
        "shadow-sm transition-[box-shadow,transform] duration-200",
        getListingCardBgClass(result.crop),
        isUnavailable && "opacity-60 saturate-50",
        isInteractive &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md focus-visible:outline-none",
        !isInteractive && "hover:shadow-md",
      )}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleActivate : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
    >
      <div className="relative min-h-0 w-full overflow-hidden">
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
                "h-auto bg-white/95 px-1.5 py-0.5 shadow-sm ring-1 ring-black/5",
                !forceLight && "dark:bg-stone-900/95",
              )}
              size="sm"
              variant="secondary"
            >
              <Chip.Label className="text-[10px]">
                {resolvedStatus === "deleted"
                  ? "No longer available"
                  : formatListingStatus(resolvedStatus)}
              </Chip.Label>
            </Chip>
          ) : result.score > 0 ? (
            <Chip
              className={clsx(
                "h-auto bg-white/95 px-1.5 py-0.5 shadow-sm ring-1 ring-black/5",
                !forceLight && "dark:bg-stone-900/95",
              )}
              size="sm"
              variant="secondary"
            >
              <Chip.Label className="text-[10px]">
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

      {isInteractive ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center rounded-[inherit] bg-linear-to-t from-black/35 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <span className="mb-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-neutral-900 shadow-sm ring-1 ring-black/5">
            View details
          </span>
        </div>
      ) : null}

      <ListingCardNoiseOverlay />

      <div className="relative z-10 flex min-h-0 flex-col gap-1 px-2.5 pb-2.5 pt-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <CropBadge crop={result.crop} size="sm" />
          <h3
            className={clsx(
              "truncate text-xs font-semibold capitalize text-neutral-900",
              !forceLight && "dark:text-neutral-50",
            )}
          >
            {theme.label}
          </h3>
        </div>

        <p
          className={clsx(
            "text-base font-semibold leading-none tracking-tight text-neutral-900",
            !forceLight && "dark:text-neutral-50",
          )}
        >
          KES {result.pricePerKg}
          <span
            className={clsx(
              "text-[11px] font-medium text-neutral-600",
              !forceLight && "dark:text-neutral-400",
            )}
          >
            /kg
          </span>
        </p>

        <p
          className={clsx(
            "truncate text-[11px] text-neutral-600",
            !forceLight && "dark:text-neutral-400",
          )}
        >
          {result.quantityKg} kg
          {result.grade ? ` · ${result.grade}` : ""}
          {" · "}
          {result.county}
        </p>

        <p
          className={clsx(
            "truncate text-[11px] font-medium text-neutral-700",
            !forceLight && "dark:text-neutral-300",
          )}
        >
          {result.cooperativeName}
        </p>

        {showInlineOrder ? (
          <Button
            className="mt-1 w-full rounded-full bg-accent text-[11px] font-semibold text-accent-foreground"
            size="sm"
            variant="primary"
            onPress={() => onOrder?.(result)}
          >
            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} />
            Order
          </Button>
        ) : null}
      </div>
    </article>
  );
}
