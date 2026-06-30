"use client";

import type { BuyerSourcingListingResult } from "@repo/types";
import {
  getBuyerListingDescription,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "@repo/types";
import { Chip } from "@heroui/react";
import clsx from "clsx";

import { CropBadge } from "@/components/farmer/crop-display";

type BuyerListingCardProps = {
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

export function BuyerListingCard({ result }: BuyerListingCardProps) {
  const theme = getCropTheme(result.crop);
  const description = getBuyerListingDescription(result.description);
  const trimmedDescription = description.trim();

  return (
    <article
      className={clsx(
        "relative flex aspect-square flex-col overflow-hidden rounded-[0.875rem] p-4.5",
        "shadow-sm transition-shadow duration-200 hover:shadow-md",
        getListingCardBgClass(result.crop),
      )}
    >
      <ListingCardNoiseOverlay />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <CropBadge crop={result.crop} size="md" />
            <h3 className="truncate text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-50">
              {theme.label}
            </h3>
          </div>
          <Chip
            className="shrink-0 bg-white/90 ring-1 ring-black/5 dark:bg-stone-900/90"
            size="sm"
            variant="secondary"
          >
            <Chip.Label>{Math.round(result.score * 100)}%</Chip.Label>
          </Chip>
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="text-[1.375rem] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">
            KES {result.pricePerKg}
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              /kg
            </span>
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {result.quantityKg} kg
          </p>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {result.county}
          {result.grade ? ` · ${result.grade}` : ""}
        </p>

        <p className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {result.cooperativeName}
        </p>

        {trimmedDescription.length > 0 ? (
          <p className="mt-auto line-clamp-2 border-l-2 border-neutral-300/60 pl-2.5 text-xs italic leading-relaxed text-neutral-600 dark:border-neutral-600/50 dark:text-neutral-400">
            &ldquo;{trimmedDescription}&rdquo;
          </p>
        ) : null}
      </div>
    </article>
  );
}
