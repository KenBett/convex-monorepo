import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type { ListingStatus } from "@repo/types";
import {
  formatListingStatus,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "@repo/types";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { CropBadge } from "@/components/crop-display";

export type FarmerListingCardData = {
  county: string;
  crop: string;
  description: string;
  grade?: string;
  imageUrl?: string | null;
  pricePerKg: number;
  quantityKg: number;
  status: ListingStatus;
};

type FarmerListingCardProps = {
  listing: FarmerListingCardData;
  listingId: Id<"listings">;
};

function ListingStatusPill({ status }: { status: ListingStatus }): JSX.Element {
  const isActive = status === "active";

  return (
    <View
      className={`flex-row shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 ring-1 ring-black/5 ${
        isActive
          ? "bg-white/95 dark:bg-stone-900/95"
          : "bg-white/95 dark:bg-stone-900/95"
      }`}
    >
      <View
        className={`h-1 w-1 rounded-full ${
          isActive ? "bg-emerald-600 dark:bg-emerald-400" : "bg-stone-500"
        }`}
      />
      <Text
        className={`text-[10px] font-medium leading-none ${
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

export function FarmerListingCard({
  listing,
  listingId,
}: FarmerListingCardProps): JSX.Element {
  const router = useRouter();
  const theme = getCropTheme(listing.crop);
  const bgClass = getListingCardBgClass(listing.crop);
  const isSoldOut = listing.status === "sold_out";

  return (
    <Pressable
      accessibilityRole="link"
      className={`relative aspect-square w-[48%] flex-col overflow-hidden rounded-[0.875rem] shadow-sm active:opacity-95 ${bgClass} ${
        isSoldOut ? "opacity-90" : ""
      }`}
      onPress={() => {
        router.push({
          pathname: "/(farmer)/listings/[id]",
          params: { id: listingId },
        });
      }}
    >
      <ListingCardNoiseOverlay />

      <View className="relative min-h-0 flex-1 overflow-hidden">
        {listing.imageUrl ? (
          <Image
            accessibilityLabel={`${theme.label} listing photo`}
            className="absolute inset-0 h-full w-full"
            resizeMode="cover"
            source={{ uri: listing.imageUrl }}
          />
        ) : (
          <View className="h-full items-center justify-center bg-black/5 dark:bg-black/20">
            <CropBadge crop={listing.crop} size="lg" />
          </View>
        )}
        <View className="absolute right-2 top-2 z-10">
          <ListingStatusPill status={listing.status} />
        </View>
      </View>

      <View className="gap-1 px-2.5 pb-2.5 pt-2">
        <View className="flex-row items-center gap-1.5">
          <CropBadge crop={listing.crop} size="sm" />
          <Text
            className="flex-1 text-xs font-semibold capitalize text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {theme.label}
          </Text>
        </View>

        <Text className="text-base font-semibold leading-none text-neutral-900 dark:text-neutral-50">
          KES {listing.pricePerKg}
          <Text className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            /kg
          </Text>
        </Text>

        <Text className="text-[11px] text-neutral-600 dark:text-neutral-400" numberOfLines={1}>
          {listing.quantityKg} kg
          {listing.grade ? ` · ${listing.grade}` : ""}
          {" · "}
          {listing.county}
        </Text>
      </View>
    </Pressable>
  );
}
