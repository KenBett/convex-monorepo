import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button, Dialog, Surface, useThemeColor } from "heroui-native";
import { Plus } from "lucide-react-native";
import type { JSX } from "react";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AppEmptyState } from "@/components/app-empty-state";
import { FarmerListingCard } from "@/components/listing-card";
import { ListingForm } from "@/components/listing-form";
import { ScreenShell } from "@/components/screen-shell";

export default function MyProductsScreen(): JSX.Element {
  const listings = useQuery(api.listings.listingsByFarmer);
  const foregroundColor = useThemeColor("foreground");

  const [createOpen, setCreateOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);

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
              <Dialog.Content className="max-h-[92%] w-full rounded-card bg-surface p-card-lg">
                <View className="mb-2 flex-row items-center justify-end">
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

          <View className="gap-section-title">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-section-title">Your listings</Text>
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
            </View>
            {listings.length === 0 ? (
              <Surface variant="default" className="rounded-card p-card-lg">
                <AppEmptyState
                  action={
                    <Button
                      size="sm"
                      onPress={() => setCreateOpen(true)}
                    >
                      Add listing
                    </Button>
                  }
                  description="Tap + or add your first listing to get started."
                  illustration="empty-listings"
                  illustrationSize={120}
                  title="No listings yet"
                />
              </Surface>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {listings.map((listing) => (
                  <FarmerListingCard
                    key={listing._id}
                    listing={listing}
                    listingId={listing._id}
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
