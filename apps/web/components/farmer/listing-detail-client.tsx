"use client";

import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ListingDetailForm } from "@/components/farmer/listing-detail-form";

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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
        href="/farmer/my-products"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        My products
      </Link>

      <ListingDetailForm listing={listing} />
    </div>
  );
}
