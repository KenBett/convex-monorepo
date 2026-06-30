"use client";

import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Package, Scale, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import clsx from "clsx";

import { FarmerListingCard } from "@/components/farmer/listing-card";
import { FarmerOrdersPreview } from "@/components/farmer/farmer-orders-client";

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
      activePreview: activeListings.slice(0, 3),
    };
  }, [listings]);

  if (listings === undefined) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Farmer dashboard
        </h1>
        <p className="text-sm text-muted">
          Your active listings and marketplace overview.
        </p>
      </div>

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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Active listings
          </h2>
          <Link
            className="text-sm font-medium text-accent hover:underline"
            href="/farmer/my-products"
          >
            View all
          </Link>
        </div>

        {stats && stats.activePreview.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.activePreview.map((listing) => (
              <FarmerListingCard
                key={listing._id}
                listing={listing}
                listingId={listing._id}
              />
            ))}
          </div>
        ) : (
          <div
            className={clsx(
              "flex flex-col items-center gap-4 rounded-[0.875rem] border border-dashed border-separator bg-surface px-6 py-10 text-center",
            )}
          >
            <p className="text-sm text-muted">
              No active listings yet. Add your first crop so buyers can find
              you.
            </p>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
              href="/farmer/my-products"
            >
              Go to My Products
            </Link>
          </div>
        )}
      </section>

      <FarmerOrdersPreview />
    </div>
  );
}
