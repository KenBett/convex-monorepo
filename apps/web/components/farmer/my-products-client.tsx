"use client";

import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Package, Plus, Scale, ShoppingBag, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import clsx from "clsx";

import { FarmerListingCard } from "@/components/farmer/listing-card";
import { ListingForm } from "@/components/farmer/listing-form";

type ListingStat = {
  label: string;
  value: string;
  icon: typeof Package;
};

function ListingStatCard({ label, value, icon: Icon }: ListingStat) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-[0.875rem] border border-separator bg-surface p-4 text-surface-foreground",
        "shadow-[0_1px_3px_oklch(0%_0_0/0.05)] dark:shadow-[0_1px_4px_oklch(0%_0_0/0.28)]",
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
        "flex flex-col items-center gap-5 rounded-[0.875rem] border border-dashed border-separator bg-surface px-6 py-14 text-center",
        "shadow-[0_1px_3px_oklch(0%_0_0/0.05)] dark:shadow-[0_1px_4px_oklch(0%_0_0/0.28)]",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-default/45">
        <Package className="h-5 w-5 text-muted" strokeWidth={1.75} />
      </div>
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 className="text-base font-semibold text-foreground">
          No listings yet
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Add your first crop listing so buyers can discover your produce across
          web and mobile.
        </p>
      </div>
      <Button
        className="rounded-full bg-accent px-5 font-medium text-accent-foreground"
        size="sm"
        variant="primary"
        onPress={onAddListing}
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Add listing
      </Button>
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
    return (
      <div className="mx-auto flex w-full max-w-4xl items-center justify-center py-16">
        <p className="text-sm text-muted">Loading listings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
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

      <section className="flex flex-col gap-4">
        {listings.length === 0 ? (
          <ListingsEmptyState onAddListing={createModalState.open} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-3">
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
