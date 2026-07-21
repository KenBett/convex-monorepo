"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { DemoSearchPromptPanel } from "@/components/demo/demo-search-prompt-panel";
import { ListingDetailForm } from "@/components/farmer/listing-detail-form";

/** Temporary — remove with /demo/listings when demos are done. */
export function DemoListingDetailClient() {
  const params = useParams<{ id: string }>();
  const listingId = params.id as Id<"listings">;
  const demoEnabled = useQuery(api.orders.demoPaymentsEnabled);
  const listing = useQuery(
    api.listings.demoInventory.getById,
    demoEnabled === true ? { listingId } : "skip",
  );

  if (demoEnabled === undefined || (demoEnabled && listing === undefined)) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
          href="/demo/listings"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Demo listings
        </Link>
        <p className="text-sm text-muted">Loading listing…</p>
      </div>
    );
  }

  if (demoEnabled === false) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
          href="/demo/listings"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Demo listings
        </Link>
        <p className="text-sm text-muted">
          Set Convex env <code>DEMO_PAYMENTS=true</code> to edit demo listings.
        </p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
          href="/demo/listings"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Demo listings
        </Link>
        <p className="text-sm text-muted">Listing not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
          href="/demo/listings"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Demo listings
        </Link>
        <p className="text-sm font-medium text-foreground">
          {listing.cooperativeName}
          <span className="font-normal text-muted"> · {listing.county}</span>
        </p>
      </div>

      {listing.demoSearchPrompt ? (
        <DemoSearchPromptPanel
          pinterestQuery={listing.demoPinterestQuery}
          prompt={listing.demoSearchPrompt}
        />
      ) : null}

      <ListingDetailForm
        listPath="/demo/listings"
        listing={listing}
        mode="demo"
      />
    </div>
  );
}
