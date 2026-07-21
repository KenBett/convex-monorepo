"use client";

import { AppEmptyState } from "@repo/illustrations";
import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Plus, Package, Scale, ShoppingBag, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import clsx from "clsx";

import { FarmerListingCard } from "@/components/farmer/listing-card";
import { ListingForm } from "@/components/farmer/listing-form";
import { MyProductsSkeleton } from "@/components/farmer/my-products-skeleton";

/** Fills viewport below fixed navbar (and mobile tab bar), so only the grid scrolls. */
const PAGE_FRAME_CLASSES = clsx(
  "mx-auto flex w-full max-w-4xl flex-col gap-4",
  // mobile: navbar (3rem) + tab bar (4rem + safe)
  "h-[calc(100dvh-3rem-4rem-env(safe-area-inset-bottom,0px))]",
  // desktop: navbar (3.5rem) + main pb-8 (2rem)
  "md:h-[calc(100dvh-3.5rem-2rem)]",
);

type ListingStat = {
  label: string;
  value: string;
  icon: typeof Package;
};

function ListingStatCard({ label, value, icon: Icon }: ListingStat) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-[0.875rem] bg-surface p-4 text-surface-foreground shadow-sm dark:shadow-none",
      )}
    >
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function ListingsEmptyState({ onAddListing }: { onAddListing: () => void }) {
  return (
    <div
      className={clsx(
        "rounded-[0.875rem] border border-dashed border-separator bg-surface px-6 py-10",
        "shadow-[0_1px_3px_oklch(0%_0_0/0.05)] dark:shadow-[0_1px_4px_oklch(0%_0_0/0.28)]",
      )}
    >
      <AppEmptyState
        action={
          <Button
            className="rounded-full bg-accent px-5 font-medium text-accent-foreground"
            size="sm"
            variant="primary"
            onPress={onAddListing}
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add listing
          </Button>
        }
        description="Add your first crop listing so buyers can discover your produce across web and mobile."
        illustration="empty-listings"
        illustrationSize={150}
        title="No listings yet"
      />
    </div>
  );
}

export function MyProductsClient() {
  const listings = useQuery(api.listings.listingsByFarmer);
  const createModalState = useOverlayState();
  const [createFormKey, setCreateFormKey] = useState(0);

  const stats = useMemo(() => {
    if (!listings) {
      return null;
    }

    const activeListings = listings.filter(
      (listing) => listing.status === "active",
    );
    const soldOutListings = listings.filter(
      (listing) => listing.status === "sold_out",
    );
    const totalKgAvailable = activeListings.reduce(
      (total, listing) => total + listing.quantityKg,
      0,
    );

    return {
      activeCount: activeListings.length,
      soldOutCount: soldOutListings.length,
      totalKgAvailable,
    };
  }, [listings]);

  if (listings === undefined) {
    return <MyProductsSkeleton />;
  }

  return (
    <div className={PAGE_FRAME_CLASSES}>
      <Modal state={createModalState}>
        <Modal.Backdrop>
          <Modal.Container scroll="inside" size="lg">
            <Modal.Dialog className="flex max-h-[min(90dvh,720px)] flex-col p-6">
              <Modal.Body className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
                <ListingForm
                  key={createFormKey}
                  embedded
                  onCancel={createModalState.close}
                  onSubmitted={() => {
                    createModalState.close();
                    setCreateFormKey((current) => current + 1);
                  }}
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <div className="flex shrink-0 flex-col gap-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              My Products
            </h1>
          </div>
          <Button
            className="shrink-0 rounded-full bg-accent px-4 font-medium text-accent-foreground sm:mt-0.5"
            size="sm"
            variant="primary"
            onPress={createModalState.open}
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add listing
          </Button>
        </header>

        {stats ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ListingStatCard
              icon={Tag}
              label="Active listings"
              value={String(stats.activeCount)}
            />
            <ListingStatCard
              icon={ShoppingBag}
              label="Sold out"
              value={String(stats.soldOutCount)}
            />
            <ListingStatCard
              icon={Scale}
              label="Kg available"
              value={`${stats.totalKgAvailable.toLocaleString()} kg`}
            />
          </div>
        ) : null}
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pr-0.5">
        {listings.length === 0 ? (
          <ListingsEmptyState onAddListing={createModalState.open} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 pb-1">
            {listings.map((listing) => (
              <FarmerListingCard
                key={listing._id}
                listing={listing}
                listingId={listing._id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
