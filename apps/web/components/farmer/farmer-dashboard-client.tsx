"use client";

import { AppEmptyState } from "@repo/illustrations";
import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Package, Scale, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import clsx from "clsx";

import { FarmerListingCard } from "@/components/farmer/listing-card";
import { FarmerOrdersPreview } from "@/components/farmer/farmer-orders-client";
import { VunrLogoLoader } from "@/components/layout/vunr-logo-loader";

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

export function FarmerDashboardClient() {
  const listings = useQuery(api.listings.listingsByFarmer);

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
      activePreview: activeListings.slice(0, 8),
    };
  }, [listings]);

  if (listings === undefined) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <VunrLogoLoader fullScreen={false} size={36} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      {stats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <ListingStatCard
            icon={Package}
            label="Active listings"
            value={String(stats.activeCount)}
          />
          <ListingStatCard
            icon={Scale}
            label="Kg available"
            value={String(stats.totalKgAvailable)}
          />
          <ListingStatCard
            icon={ShoppingBag}
            label="Sold out"
            value={String(stats.soldOutCount)}
          />
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Active listings
        </h2>

        {stats && stats.activePreview.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2.5 sm:gap-3">
            {stats.activePreview.map((listing) => (
              <FarmerListingCard
                key={listing._id}
                compact
                listing={listing}
                listingId={listing._id}
              />
            ))}
          </div>
        ) : (
          <div
            className={clsx(
              "rounded-[0.875rem] border border-dashed border-separator bg-surface px-6 py-8",
            )}
          >
            <AppEmptyState
              action={
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
                  href="/farmer/my-products"
                >
                  Go to My Products
                </Link>
              }
              description="Add your first crop so buyers can find you."
              illustration="empty-dashboard"
              illustrationSize={140}
              title="No active listings yet"
            />
          </div>
        )}
      </section>

      <FarmerOrdersPreview />
    </div>
  );
}
