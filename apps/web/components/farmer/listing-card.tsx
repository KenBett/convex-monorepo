"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type {
  ListingCertification,
  ListingPackaging,
  ListingStatus,
  ListingTag,
} from "@repo/types";

import {
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
import { ListingCardFace } from "@/components/listing/listing-card-face";

export type FarmerListingCardData = {
  certifications?: ListingCertification[];
  county: string;
  crop: string;
  description: string;
  grade?: string;
  harvestWindowLabel?: string;
  imageUrl?: string | null;
  minOrderKg?: number;
  packaging?: ListingPackaging;
  packUnitKg?: number;
  pricePerKg: number;
  quantityKg: number;
  sizeOrCalibre?: string;
  status: ListingStatus;
  tags?: ListingTag[];
  variety?: string;
};

type FarmerListingCardProps = {
  compact?: boolean;
  /** Override detail navigation (defaults to farmer listing path). */
  href?: string;
  listing: FarmerListingCardData;
  listingId: Id<"listings">;
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

export function FarmerListingCard({
  compact = false,
  href,
  listing,
  listingId,
}: FarmerListingCardProps) {
  const router = useRouter();
  const theme = getCropTheme(listing.crop);
  const bgClass = getListingCardBgClass(listing.crop);
  const isSoldOut = listing.status === "sold_out";

  const navigateToDetail = () => {
    router.push(href ?? farmerListingDetailPath(listingId));
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
        "group relative flex cursor-pointer flex-col overflow-hidden",
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
      <div
        className={clsx(
          "relative w-full shrink-0 overflow-hidden",
          compact ? "aspect-[3/2]" : "aspect-[16/10]",
        )}
      >
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
      </div>

      <ListingCardNoiseOverlay />

      <ListingCardFace
        compact={compact}
        cropBadge={<CropBadge crop={listing.crop} size="sm" />}
        cropLabel={theme.label}
        listing={listing}
        status={listing.status}
      />
    </article>
  );
}
