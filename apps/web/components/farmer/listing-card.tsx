import type { ListingStatus } from "@repo/types";
import { formatListingStatus, getCropTheme } from "@repo/types";
import { Button } from "@heroui/react";
import clsx from "clsx";

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
  isMarkingSoldOut?: boolean;
  onEdit: () => void;
  onMarkSoldOut: () => void;
};

function ListingStatusPill({ status }: { status: ListingStatus }) {
  const isActive = status === "active";

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
        isActive
          ? "bg-success/10 text-success"
          : "bg-default text-muted",
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          isActive ? "bg-success" : "bg-muted",
        )}
      />
      {formatListingStatus(status)}
    </span>
  );
}

export function FarmerListingCard({
  listing,
  isMarkingSoldOut = false,
  onEdit,
  onMarkSoldOut,
}: FarmerListingCardProps) {
  const theme = getCropTheme(listing.crop);
  const isSoldOut = listing.status === "sold_out";
  const trimmedDescription = listing.description.trim();

  return (
    <article
      className={clsx(
        "group flex flex-col gap-3.5 rounded-[0.875rem] border border-separator bg-surface p-4.5 text-surface-foreground",
        "shadow-[0_1px_3px_oklch(0%_0_0/0.05)] transition-[box-shadow,transform] duration-200",
        "hover:shadow-[0_6px_18px_oklch(0%_0_0/0.08)]",
        "dark:shadow-[0_1px_4px_oklch(0%_0_0/0.28)] dark:hover:shadow-[0_6px_20px_oklch(0%_0_0/0.38)]",
        isSoldOut && "opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <CropBadge crop={listing.crop} size="md" />
          <h2 className="truncate text-sm font-semibold capitalize text-foreground">
            {theme.label}
          </h2>
        </div>
        <ListingStatusPill status={listing.status} />
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-[1.375rem] font-semibold leading-tight tracking-tight text-foreground">
          KES {listing.pricePerKg}
          <span className="text-sm font-medium text-muted">/kg</span>
        </p>
        <p className="text-sm text-muted">{listing.quantityKg} kg</p>
      </div>

      <p className="text-xs text-muted">
        {listing.county}
        {listing.grade ? ` · ${listing.grade}` : ""}
      </p>

      {trimmedDescription.length > 0 ? (
        <p className="border-l-2 border-separator pl-2.5 text-xs italic leading-relaxed text-muted">
          &ldquo;{trimmedDescription}&rdquo;
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 pt-0.5">
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
    </article>
  );
}
