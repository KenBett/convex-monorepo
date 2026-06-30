"use client";

import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type { ListingFormInput } from "@repo/types";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@heroui/react";

import { ListingForm } from "@/components/farmer/listing-form";

function formatStatus(status: string): string {
  return status.replace("_", " ");
}

function listingToFormInput(listing: {
  county: string;
  crop: string;
  description: string;
  pricePerKg: number;
  quantityKg: number;
}): ListingFormInput {
  return {
    county: listing.county as ListingFormInput["county"],
    crop: listing.crop as ListingFormInput["crop"],
    description: listing.description,
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
  };
}

export function MyProductsClient() {
  const listings = useQuery(api.listings.listingsByFarmer);
  const markSoldOut = useMutation(api.listings.markSoldOut);

  const [editingListingId, setEditingListingId] = useState<Id<"listings"> | null>(
    null,
  );
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingSoldOutId, setMarkingSoldOutId] = useState<Id<"listings"> | null>(
    null,
  );

  const editingListing =
    editingListingId !== null
      ? listings?.find((listing) => listing._id === editingListingId)
      : undefined;

  const handleMarkSoldOut = async (listingId: Id<"listings">, crop: string) => {
    const confirmed = window.confirm(
      `Mark ${crop} as sold out? Buyers will still see it was available but marked sold out.`,
    );
    if (!confirmed) {
      return;
    }

    setActionError(null);
    setMarkingSoldOutId(listingId);
    try {
      await markSoldOut({ listingId });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not mark listing as sold out.",
      );
    } finally {
      setMarkingSoldOutId(null);
    }
  };

  if (listings === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-3xl items-center justify-center py-16">
        <p className="text-sm text-muted">Loading listings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      {showCreateForm && editingListingId === null ? (
        <ListingForm
          key={createFormKey}
          onSubmitted={() => {
            setCreateFormKey((current) => current + 1);
          }}
        />
      ) : null}

      {editingListing ? (
        <ListingForm
          initialValues={listingToFormInput(editingListing)}
          listingId={editingListing._id}
          onCancel={() => setEditingListingId(null)}
          onSubmitted={() => setEditingListingId(null)}
        />
      ) : null}

      {!showCreateForm && editingListingId === null ? (
        <Button onPress={() => setShowCreateForm(true)}>Add listing</Button>
      ) : null}

      {actionError ? <p className="text-sm text-danger">{actionError}</p> : null}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Your listings</h1>
          <p className="text-sm text-muted">
            Changes sync instantly across mobile and web.
          </p>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-lg bg-surface px-6 py-10 text-center text-sm text-muted shadow-sm dark:shadow-none">
            No listings yet. Create your first listing above.
          </div>
        ) : (
          <div className="grid gap-4">
            {listings.map((listing) => (
              <article
                key={listing._id}
                className="flex flex-col gap-4 rounded-lg bg-surface p-5 text-surface-foreground shadow-sm dark:shadow-none"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold capitalize">{listing.crop}</h2>
                    <p className="text-sm text-muted">
                      {listing.quantityKg} kg · KES {listing.pricePerKg}/kg ·{" "}
                      {listing.county}
                    </p>
                    <p className="text-sm">{listing.description}</p>
                  </div>
                  <span className="text-sm capitalize text-muted">
                    {formatStatus(listing.status)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    onPress={() => {
                      setEditingListingId(listing._id);
                      setShowCreateForm(false);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    isDisabled={
                      listing.status === "sold_out" ||
                      markingSoldOutId === listing._id
                    }
                    variant="secondary"
                    onPress={() => {
                      void handleMarkSoldOut(listing._id, listing.crop);
                    }}
                  >
                    {listing.status === "sold_out"
                      ? "Sold out"
                      : markingSoldOutId === listing._id
                        ? "Updating..."
                        : "Mark sold out"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
