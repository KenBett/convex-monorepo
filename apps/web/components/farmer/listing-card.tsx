"use client";

import { api } from "@repo/backend/convex/_generated/api";
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
import { Button } from "@heroui/react";
import clsx from "clsx";
import { useRouter } from "next/navigation";

import { CropBadge } from "@/components/farmer/crop-display";

export type FarmerListingCardData = {
  county: string;
  crop: string;
  description: string;
  grade?: string;
  pricePerKg: number;
  quantityKg: number;
  status: ListingStatus;
};

type FarmerListingCardProps = {
  listing: FarmerListingCardData;
  listingId: Id<"listings">;
  isMarkingSoldOut?: boolean;
  onEdit: () => void;
  onMarkSoldOut: () => void;
};

function ListingStatusPill({ status }: { status: ListingStatus }) {
  const isActive = status === "active";

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ring-1 ring-black/5",
        isActive
          ? "bg-white/90 text-emerald-800 dark:bg-stone-900/90 dark:text-emerald-300"
          : "bg-white/90 text-stone-700 dark:bg-stone-900/90 dark:text-stone-300",
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
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
  listing,
  listingId,
  isMarkingSoldOut = false,
  onEdit,
  onMarkSoldOut,
}: FarmerListingCardProps) {
  const router = useRouter();
  const theme = getCropTheme(listing.crop);
  const bgClass = getListingCardBgClass(listing.crop);
  const isSoldOut = listing.status === "sold_out";
  const trimmedDescription = listing.description.trim();

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
        "group relative flex cursor-pointer flex-col gap-3.5 overflow-hidden rounded-[0.875rem] p-4.5",
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
      <ListingCardNoiseOverlay />

      <div className="relative z-10 flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <CropBadge crop={listing.crop} size="md" />
            <h2 className="truncate text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-50">
              {theme.label}
            </h2>
          </div>
          <ListingStatusPill status={listing.status} />
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="text-[1.375rem] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">
            KES {listing.pricePerKg}
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              /kg
            </span>
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {listing.quantityKg} kg
          </p>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {listing.county}
          {listing.grade ? ` · ${listing.grade}` : ""}
        </p>

        {trimmedDescription.length > 0 ? (
          <p className="border-l-2 border-neutral-300/60 pl-2.5 text-xs italic leading-relaxed text-neutral-600 dark:border-neutral-600/50 dark:text-neutral-400">
            &ldquo;{trimmedDescription}&rdquo;
          </p>
        ) : null}

        <div
          className="mt-auto flex flex-col gap-2 pt-0.5"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
        >
          <Button size="sm" variant="ghost" onPress={onEdit}>
            Edit
          </Button>
          <Button
            className={clsx(
              isSoldOut && "pointer-events-none opacity-45 shadow-none",
            )}
            isDisabled={isSoldOut || isMarkingSoldOut}
            size="sm"
            variant="danger-soft"
            onPress={onMarkSoldOut}
          >
            {isSoldOut
              ? "Sold out"
              : isMarkingSoldOut
                ? "Updating..."
                : "Mark sold out"}
          </Button>
        </div>
      </div>
    </article>
  );
}
