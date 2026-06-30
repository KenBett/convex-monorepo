import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type { ListingFormInput } from "@repo/types";
import { useMutation, useQuery } from "convex/react";
import { Surface, Button } from "heroui-native";
import type { JSX } from "react";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { ListingForm } from "@/components/listing-form";
import { ScreenShell } from "@/components/screen-shell";

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

export default function MyProductsScreen(): JSX.Element {
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

  const handleMarkSoldOut = (listingId: Id<"listings">, crop: string): void => {
    Alert.alert(
      "Mark as sold out?",
      `Buyers will still see that ${crop} was available, but marked sold out.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Mark sold out",
          onPress: () => {
            void (async () => {
              setActionError(null);
              setMarkingSoldOutId(listingId);
              try {
                await markSoldOut({ listingId });
              } catch (error) {
                setActionError(
                  error instanceof Error
                    ? error.message
                    : "Could not mark listing as sold out.",
                );
              } finally {
                setMarkingSoldOutId(null);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScreenShell title="My Products">
      {listings === undefined ? (
        <View className="items-center py-8">
          <ActivityIndicator />
        </View>
      ) : (
        <View className="gap-section">
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
            <Button size="sm" onPress={() => setShowCreateForm(true)}>
              Add listing
            </Button>
          ) : null}

          {actionError ? (
            <Text className="text-caption text-danger">{actionError}</Text>
          ) : null}

          <View className="gap-section-title">
            <Text className="text-section-title">Your listings</Text>
            {listings.length === 0 ? (
              <Surface variant="default" className="rounded-card p-card-lg">
                <Text className="text-caption text-muted text-center">
                  No listings yet. Create your first listing above.
                </Text>
              </Surface>
            ) : (
              listings.map((listing) => (
                <Surface
                  key={listing._id}
                  variant="default"
                  className="gap-3 rounded-card p-card-lg shadow-elevated"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-emphasis capitalize">{listing.crop}</Text>
                      <Text className="text-caption text-muted">
                        {listing.quantityKg} kg · KES {listing.pricePerKg}/kg ·{" "}
                        {listing.county}
                      </Text>
                      <Text className="text-caption">{listing.description}</Text>
                    </View>
                    <Text className="text-caption capitalize text-muted">
                      {formatStatus(listing.status)}
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      size="sm"
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
                      size="sm"
                      variant="secondary"
                      onPress={() => handleMarkSoldOut(listing._id, listing.crop)}
                    >
                      {listing.status === "sold_out"
                        ? "Sold out"
                        : markingSoldOutId === listing._id
                          ? "Updating..."
                          : "Mark sold out"}
                    </Button>
                  </View>
                </Surface>
              ))
            )}
          </View>
        </View>
      )}
    </ScreenShell>
  );
}
