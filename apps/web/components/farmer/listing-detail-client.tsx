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
import { useQuery } from "convex/react";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { CropBadge } from "@/components/farmer/crop-display";

function ListingStatusPill({ status }: { status: ListingStatus }) {
  const isActive = status === "active";

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none ring-1 ring-black/5",
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

export function ListingDetailClient() {
  const params = useParams<{ id: string }>();
  const listingId = params.id as Id<"listings">;
  const listing = useQuery(api.listings.getListingById, { listingId });

  if (listing === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
          href="/farmer/my-products"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          My products
        </Link>
        <p className="text-sm text-muted">Loading listing…</p>
      </div>
    );
  }

  if (listing === null) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
          href="/farmer/my-products"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          My products
        </Link>
        <p className="text-sm text-muted">Listing not found.</p>
      </div>
    );
  }

  const theme = getCropTheme(listing.crop);
  const bgClass = getListingCardBgClass(listing.crop);
  const createdAt = new Date(listing._creationTime).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
        href="/farmer/my-products"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        My products
      </Link>

      <article
        className={clsx(
          "relative overflow-hidden rounded-[0.875rem] p-6 shadow-sm",
          bgClass,
          listing.status === "sold_out" && "opacity-90",
        )}
      >
        <ListingCardNoiseOverlay />

        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <CropBadge crop={listing.crop} size="md" />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold capitalize text-neutral-900 dark:text-neutral-50">
                  {theme.label}
                </h1>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Listed {createdAt}
                </p>
              </div>
            </div>
            <ListingStatusPill status={listing.status} />
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              KES {listing.pricePerKg}
              <span className="text-base font-medium text-neutral-600 dark:text-neutral-400">
                /kg
              </span>
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {listing.quantityKg} kg available
            </p>
          </div>

          <div className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            <p>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">
                County:
              </span>{" "}
              {listing.county}
            </p>
            {listing.grade ? (
              <p>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  Grade:
                </span>{" "}
                {listing.grade}
              </p>
            ) : null}
          </div>

          {listing.description.trim().length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                Description
              </p>
              <p className="border-l-2 border-neutral-300/60 pl-3 text-sm leading-relaxed text-neutral-700 dark:border-neutral-600/50 dark:text-neutral-300">
                {listing.description}
              </p>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
