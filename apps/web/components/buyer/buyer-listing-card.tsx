"use client";

import type { BuyerSourcingListingResult } from "@repo/types";
import {
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "@repo/types";
import { Chip } from "@heroui/react";
import clsx from "clsx";
import Image from "next/image";

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

  return (
    <article
      className={clsx(
        "relative grid aspect-square grid-rows-[1fr_auto] overflow-hidden rounded-[0.875rem]",
        "shadow-sm transition-shadow duration-200 hover:shadow-md",
        getListingCardBgClass(result.crop),
      )}
    >
      <div className="relative min-h-0 w-full overflow-hidden">
        {result.imageUrl ? (
          <Image
            alt={`${theme.label} listing photo`}
            className="object-cover"
            fill
            sizes="(max-width: 768px) 50vw, 240px"
            src={result.imageUrl}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-black/4 dark:bg-black/20">
            <CropBadge crop={result.crop} size="lg" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-black/20 to-transparent" />
        <div className="absolute right-2 top-2 z-10">
          <Chip
            className="h-auto bg-white/95 px-1.5 py-0.5 shadow-sm ring-1 ring-black/5 dark:bg-stone-900/95"
            size="sm"
            variant="secondary"
          >
            <Chip.Label className="text-[10px]">
              {Math.round(result.score * 100)}% match
            </Chip.Label>
          </Chip>
        </div>
      </div>

      <ListingCardNoiseOverlay />

      <div className="relative z-10 flex min-h-0 flex-col gap-1 px-2.5 pb-2.5 pt-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <CropBadge crop={result.crop} size="sm" />
          <h3 className="truncate text-xs font-semibold capitalize text-neutral-900 dark:text-neutral-50">
            {theme.label}
          </h3>
        </div>

        <p className="text-base font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-50">
          KES {result.pricePerKg}
          <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            /kg
          </span>
        </p>

        <p className="truncate text-[11px] text-neutral-600 dark:text-neutral-400">
          {result.quantityKg} kg
          {result.grade ? ` · ${result.grade}` : ""}
          {" · "}
          {result.county}
        </p>

        <p className="truncate text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
          {result.cooperativeName}
        </p>
      </div>
    </article>
  );
}
