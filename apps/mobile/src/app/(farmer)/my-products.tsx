import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type { ListingFormInput } from "@repo/types";
import { useMutation, useQuery } from "convex/react";
import { Button, Dialog, Surface, useThemeColor } from "heroui-native";
import { Plus } from "lucide-react-native";
import type { JSX } from "react";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { FarmerListingCard } from "@/components/listing-card";
import { ListingForm } from "@/components/listing-form";
import { ScreenShell } from "@/components/screen-shell";

function listingToFormInput(listing: {
  county: string;
  crop: string;
  description: string;
  grade?: string;
  pricePerKg: number;
  quantityKg: number;
}): ListingFormInput {
  return {
    county: listing.county as ListingFormInput["county"],
    crop: listing.crop as ListingFormInput["crop"],
    description: listing.description,
    grade: listing.grade ?? "",
    pricePerKg: listing.pricePerKg,
    quantityKg: listing.quantityKg,
  };
}

export default function MyProductsScreen(): JSX.Element {
  const listings = useQuery(api.listings.listingsByFarmer);
  const markSoldOut = useMutation(api.listings.markSoldOut);
  const foregroundColor = useThemeColor("foreground");

  const [editingListingId, setEditingListingId] = useState<Id<"listings"> | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
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
          <Dialog isOpen={createOpen} onOpenChange={setCreateOpen}>
            <Dialog.Portal>
              <Dialog.Overlay isCloseOnPress onPress={() => setCreateOpen(false)} />
              <Dialog.Content className="w-full max-h-[85%] rounded-card bg-surface p-card-lg">
                <View className="mb-3 flex-row items-center justify-end">
                  <Dialog.Close />
                </View>
                <ListingForm
                  embedded
                  embeddedLayout="modal"
                  key={createFormKey}
                  onCancel={() => setCreateOpen(false)}
                  onSubmitted={() => {
                    setCreateOpen(false);
                    setCreateFormKey((current) => current + 1);
                  }}
                />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog>

          {editingListing ? (
            <ListingForm
              initialValues={listingToFormInput(editingListing)}
              listingId={editingListing._id}
              onCancel={() => setEditingListingId(null)}
              onSubmitted={() => setEditingListingId(null)}
            />
          ) : null}

          {actionError ? (
            <Text className="text-caption text-danger">{actionError}</Text>
          ) : null}

          <View className="gap-section-title">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-section-title">Your listings</Text>
              {editingListingId === null ? (
                <Button
                  accessibilityLabel="Create listing"
                  className="min-h-touch min-w-touch"
                  isIconOnly
                  size="sm"
                  variant="secondary"
                  onPress={() => setCreateOpen(true)}
                >
                  <Plus color={foregroundColor} size={18} strokeWidth={1.75} />
                </Button>
              ) : null}
            </View>
            {listings.length === 0 ? (
              <Surface variant="default" className="rounded-card p-card-lg">
                <Text className="text-caption text-muted text-center">
                  No listings yet. Tap + to create your first listing.
                </Text>
              </Surface>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {listings.map((listing) => (
                  <FarmerListingCard
                    key={listing._id}
                    isMarkingSoldOut={markingSoldOutId === listing._id}
                    listing={listing}
                    onEdit={() => {
                      setEditingListingId(listing._id);
                    }}
                    onMarkSoldOut={() => handleMarkSoldOut(listing._id, listing.crop)}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </ScreenShell>
  );
}
