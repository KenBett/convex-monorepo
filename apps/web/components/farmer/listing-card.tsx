"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type { ListingStatus } from "@repo/types";

import {
  formatListingStatus,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "@repo/types";
import { farmerListingDetailPath } from "@repo/utils";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { CropBadge } from "@/components/farmer/crop-display";

export type FarmerListingCardData = {
  county: string;
  crop: string;
  description: string;
  grade?: string;
  imageUrl?: string | null;
  pricePerKg: number;
  quantityKg: number;
  status: ListingStatus;
};

type FarmerListingCardProps = {
  compact?: boolean;
  listing: FarmerListingCardData;
  listingId: Id<"listings">;
};

function ListingStatusPill({
  compact = false,
  status,
}: {
  compact?: boolean;
  status: ListingStatus;
}) {
  const isActive = status === "active";

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-medium leading-none shadow-sm ring-1 ring-black/5",
        compact ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]",
        isActive
          ? "bg-white/95 text-emerald-800 dark:bg-stone-900/95 dark:text-emerald-300"
          : "bg-white/95 text-stone-700 dark:bg-stone-900/95 dark:text-stone-300",
      )}
    >
      <span
        className={clsx(
          "h-1 w-1 rounded-full",
          isActive ? "bg-emerald-600 dark:bg-emerald-400" : "bg-stone-500",
        )}
      />
      {formatListingStatus(status)}
    </span>
  );
}

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

export function FarmerListingCard({
  compact = false,
  listing,
  listingId,
}: FarmerListingCardProps) {
  const router = useRouter();
  const theme = getCropTheme(listing.crop);
  const bgClass = getListingCardBgClass(listing.crop);
  const isSoldOut = listing.status === "sold_out";

  const navigateToDetail = () => {
    router.push(farmerListingDetailPath(listingId));
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateToDetail();
    }
  };

  return (
    <article
      className={clsx(
        "group relative grid aspect-square cursor-pointer grid-rows-[1fr_auto] overflow-hidden",
        compact ? "rounded-lg" : "rounded-[0.875rem]",
        "shadow-sm transition-[box-shadow,transform] duration-200",
        "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
        bgClass,
        isSoldOut && "opacity-90",
      )}
      role="link"
      tabIndex={0}
      onClick={navigateToDetail}
      onKeyDown={handleCardKeyDown}
    >
      <div className="relative min-h-0 w-full overflow-hidden">
        {listing.imageUrl ? (
          <Image
            fill
            unoptimized
            alt={`${theme.label} listing photo`}
            className="object-cover"
            sizes={compact ? "120px" : "(max-width: 768px) 50vw, 240px"}
            src={listing.imageUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-black/4 dark:bg-black/20">
            <CropBadge crop={listing.crop} size={compact ? "sm" : "lg"} />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-black/20 to-transparent" />
        <div className={clsx("absolute z-10", compact ? "right-1.5 top-1.5" : "right-2 top-2")}>
          <ListingStatusPill compact={compact} status={listing.status} />
        </div>
      </div>

      <ListingCardNoiseOverlay />

      <div
        className={clsx(
          "relative z-10 flex min-h-0 flex-col",
          compact ? "gap-0.5 px-2 pb-2 pt-1.5" : "gap-1 px-2.5 pb-2.5 pt-2",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <CropBadge crop={listing.crop} size="sm" />
          <h2
            className={clsx(
              "truncate font-semibold capitalize text-neutral-900 dark:text-neutral-50",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            {theme.label}
          </h2>
        </div>

        <p
          className={clsx(
            "font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-50",
            compact ? "text-sm" : "text-base",
          )}
        >
          KES {listing.pricePerKg}
          <span
            className={clsx(
              "font-medium text-neutral-600 dark:text-neutral-400",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            /kg
          </span>
        </p>

        <p
          className={clsx(
            "truncate text-neutral-600 dark:text-neutral-400",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {listing.quantityKg} kg
          {listing.grade ? ` · ${listing.grade}` : ""}
          {" · "}
          {listing.county}
        </p>
      </div>
    </article>
  );
}
