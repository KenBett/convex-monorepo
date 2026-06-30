import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { ListingDetailForm } from "@/components/listing-detail-form";
import { ScreenShell } from "@/components/screen-shell";

export default function ListingDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = id as Id<"listings">;
  const listing = useQuery(api.listings.getListingById, { listingId });

  if (listing === undefined) {
    return (
      <ScreenShell title="Listing">
        <View className="items-center py-8">
          <ActivityIndicator />
        </View>
      </ScreenShell>
    );
  }

  if (listing === null) {
    return (
      <ScreenShell title="Listing">
        <Text className="text-caption text-muted">Listing not found.</Text>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Listing">
      <ListingDetailForm listing={listing} />
    </ScreenShell>
  );
}
