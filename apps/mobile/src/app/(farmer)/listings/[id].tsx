import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type { ListingStatus } from "@repo/types";
import {
  formatListingStatus,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "@repo/types";
import { useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

import { CropBadge } from "@/components/crop-display";
import { ScreenShell } from "@/components/screen-shell";

function ListingStatusPill({ status }: { status: ListingStatus }): JSX.Element {
  const isActive = status === "active";

  return (
    <View
      className={`flex-row shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-black/5 ${
        isActive
          ? "bg-white/90 dark:bg-stone-900/90"
          : "bg-white/90 dark:bg-stone-900/90"
      }`}
    >
      <View
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-600 dark:bg-emerald-400" : "bg-stone-500"
        }`}
      />
      <Text
        className={`text-xs font-medium leading-none ${
          isActive
            ? "text-emerald-800 dark:text-emerald-300"
            : "text-stone-700 dark:text-stone-300"
        }`}
      >
        {formatListingStatus(status)}
      </Text>
    </View>
  );
}

function ListingCardNoiseOverlay(): JSX.Element {
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Image
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        resizeMode="repeat"
        source={{ uri: LISTING_CARD_NOISE_DATA_URI }}
        className="absolute inset-0"
        style={{ opacity: LISTING_CARD_NOISE_OPACITY }}
      />
    </View>
  );
}

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

  const theme = getCropTheme(listing.crop);
  const bgClass = getListingCardBgClass(listing.crop);
  const createdAt = new Date(listing._creationTime).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

  return (
    <ScreenShell title="Listing">
      <View
        className={`relative overflow-hidden rounded-[0.875rem] p-card-lg shadow-sm ${bgClass} ${
          listing.status === "sold_out" ? "opacity-90" : ""
        }`}
      >
        <ListingCardNoiseOverlay />

        <View className="relative z-10 gap-section">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
              <CropBadge crop={listing.crop} size="md" />
              <View className="min-w-0 flex-1">
                <Text className="text-section-title capitalize text-neutral-900 dark:text-neutral-50">
                  {theme.label}
                </Text>
                <Text className="text-caption text-neutral-600 dark:text-neutral-400">
                  Listed {createdAt}
                </Text>
              </View>
            </View>
            <ListingStatusPill status={listing.status} />
          </View>

          <View className="gap-1">
            <Text className="text-[28px] font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
              KES {listing.pricePerKg}
              <Text className="text-base font-medium text-neutral-600 dark:text-neutral-400">
                /kg
              </Text>
            </Text>
            <Text className="text-sm text-neutral-600 dark:text-neutral-400">
              {listing.quantityKg} kg available
            </Text>
          </View>

          <View className="gap-1">
            <Text className="text-sm text-neutral-600 dark:text-neutral-400">
              <Text className="font-medium text-neutral-800 dark:text-neutral-200">
                County:{" "}
              </Text>
              {listing.county}
            </Text>
            {listing.grade ? (
              <Text className="text-sm text-neutral-600 dark:text-neutral-400">
                <Text className="font-medium text-neutral-800 dark:text-neutral-200">
                  Grade:{" "}
                </Text>
                {listing.grade}
              </Text>
            ) : null}
          </View>

          {listing.description.trim().length > 0 ? (
            <View className="gap-1.5">
              <Text className="text-caption font-medium uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                Description
              </Text>
              <Text className="border-l-2 border-neutral-300/60 pl-3 text-sm leading-relaxed text-neutral-700 dark:border-neutral-600/50 dark:text-neutral-300">
                {listing.description}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </ScreenShell>
  );
}
