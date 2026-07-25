"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { AppEmptyState } from "@repo/illustrations";
import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Plus, Scale, ShoppingBag, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Label, ListBox, Select, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import clsx from "clsx";

import { FarmerListingCard } from "@/components/farmer/listing-card";
import { ListingForm } from "@/components/farmer/listing-form";
import { MyProductsSkeleton } from "@/components/farmer/my-products-skeleton";
import { DemoSearchPromptPanel } from "@/components/demo/demo-search-prompt-panel";

/** Temporary — remove with /demo/listings when demos are done. */
const PAGE_FRAME_CLASSES = clsx(
  "mx-auto flex w-full max-w-4xl flex-col gap-4",
  "h-[calc(100dvh-3rem-1.5rem)] md:h-[calc(100dvh-3.5rem-2rem)]",
);

type ListingStat = {
  label: string;
  value: string;
  icon: typeof Tag;
};

function ListingStatCard({ label, value, icon: Icon }: ListingStat) {
  return (
    <div className="flex flex-col gap-2 rounded-[0.875rem] bg-surface p-4 text-surface-foreground shadow-sm dark:shadow-none">
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

export function DemoListingsClient() {
  const demoEnabled = useQuery(api.orders.demoPaymentsEnabled);
  const listings = useQuery(
    api.listings.demoInventory.listAll,
    demoEnabled === true ? {} : "skip",
  );
  const farmers = useQuery(
    api.listings.demoInventory.listFarmers,
    demoEnabled === true ? {} : "skip",
  );
  const createModalState = useOverlayState();
  const [createFormKey, setCreateFormKey] = useState(0);
  const [createFarmerId, setCreateFarmerId] = useState<
    Id<"farmerProfiles"> | ""
  >("");

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

  if (demoEnabled === undefined || (demoEnabled && listings === undefined)) {
    return <MyProductsSkeleton />;
  }

  if (demoEnabled === false) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-1 py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Demo listings
        </h1>
        <p className="text-sm text-muted">
          Set Convex env <code>DEMO_PAYMENTS=true</code> to use this temporary
          inventory console.
        </p>
      </div>
    );
  }

  if (!listings) {
    return <MyProductsSkeleton />;
  }

  const openCreate = () => {
    setCreateFarmerId(farmers?.[0]?._id ?? "");
    setCreateFormKey((current) => current + 1);
    createModalState.open();
  };

  return (
    <div className={PAGE_FRAME_CLASSES}>
      <Modal state={createModalState}>
        <Modal.Backdrop>
          <Modal.Container scroll="inside" size="lg">
            <Modal.Dialog className="flex max-h-[min(90dvh,720px)] flex-col p-6">
              <Modal.Body className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-0">
                <div className="shrink-0 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                  Temporary demo console — create under any coop without signing
                  in as that farmer. Remove <code>/demo/listings</code> when
                  done.
                </div>

                {farmers && farmers.length > 0 ? (
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Label className="text-sm font-medium">Cooperative</Label>
                    <Select
                      aria-label="Cooperative"
                      className="w-full"
                      placeholder="Select cooperative"
                      selectedKey={createFarmerId || undefined}
                      onSelectionChange={(key) => {
                        if (key == null) {
                          return;
                        }
                        setCreateFarmerId(String(key) as Id<"farmerProfiles">);
                      }}
                    >
                      <Select.Trigger className="w-full rounded-lg bg-field-background shadow-sm dark:border dark:border-separator">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {farmers.map((farmer) => (
                            <ListBox.Item
                              key={farmer._id}
                              id={farmer._id}
                              textValue={`${farmer.cooperativeName} · ${farmer.county}`}
                            >
                              {farmer.cooperativeName}
                              <span className="text-muted">
                                {" "}
                                · {farmer.county}
                              </span>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    No farmer profiles yet. Seed hotel demo inventory first.
                  </p>
                )}

                <ListingForm
                  key={createFormKey}
                  embedded
                  farmerId={createFarmerId || undefined}
                  mode="demo"
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
              Demo listings
            </h1>
            <p className="text-sm text-muted">
              Edit photos and details for any listing — including seed coops
              without Google accounts. Copy a demo query into buyer chat to
              rehearse semantic search.
            </p>
          </div>
          <Button
            className="shrink-0 rounded-full bg-accent px-4 font-medium text-accent-foreground sm:mt-0.5"
            size="sm"
            variant="primary"
            onPress={openCreate}
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
          <div className="rounded-[0.875rem] border border-dashed border-separator bg-surface px-6 py-10">
            <AppEmptyState
              action={
                <Button
                  className="rounded-full bg-accent px-5 font-medium text-accent-foreground"
                  size="sm"
                  variant="primary"
                  onPress={openCreate}
                >
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Add listing
                </Button>
              }
              description="Seed demo inventory, or create a listing under any cooperative here."
              illustration="empty-listings"
              illustrationSize={150}
              title="No listings yet"
            />
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 pb-1">
            {listings.map((listing) => (
              <div key={listing._id} className="flex flex-col gap-1.5">
                <FarmerListingCard
                  href={`/demo/listings/${listing._id}`}
                  listing={listing}
                  listingId={listing._id}
                />
                <p className="truncate px-0.5 text-[11px] font-medium text-muted">
                  {listing.cooperativeName}
                </p>
                {listing.demoSearchPrompt ? (
                  <DemoSearchPromptPanel
                    compact
                    pinterestQuery={listing.demoPinterestQuery}
                    prompt={listing.demoSearchPrompt}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
