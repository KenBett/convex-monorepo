import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type { ListingStatus } from "@repo/types";
import {
  formatListingStatus,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "@repo/types";
import { Button } from "heroui-native";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { CropBadge } from "@/components/crop-display";

export type FarmerListingCardData = {
  county: string;
  crop: string;
  description: string;
  grade?: string;
  pricePerKg: number;
  quantityKg: number;
  status: ListingStatus;
};

type FarmerListingCardProps = {
  listing: FarmerListingCardData;
  listingId: Id<"listings">;
  isMarkingSoldOut?: boolean;
  onEdit: () => void;
  onMarkSoldOut: () => void;
};

function ListingStatusPill({ status }: { status: ListingStatus }): JSX.Element {
  const isActive = status === "active";

  return (
    <View
      className={`flex-row shrink-0 items-center gap-1.5 rounded-full px-2 py-1 ring-1 ring-black/5 ${
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
        className={`text-[11px] font-medium leading-none ${
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
  isMarkingSoldOut = false,
  onEdit,
  onMarkSoldOut,
}: FarmerListingCardProps): JSX.Element {
  const router = useRouter();
  const theme = getCropTheme(listing.crop);
  const bgClass = getListingCardBgClass(listing.crop);
  const isSoldOut = listing.status === "sold_out";
  const trimmedDescription = listing.description.trim();

  return (
    <View
      className={`relative w-[48%] overflow-hidden rounded-[0.875rem] shadow-sm ${bgClass} ${
        isSoldOut ? "opacity-90" : ""
      }`}
    >
      <ListingCardNoiseOverlay />

      <Pressable
        accessibilityRole="link"
        className="active:opacity-95"
        onPress={() => {
          router.push({
            pathname: "/(farmer)/listings/[id]",
            params: { id: listingId },
          });
        }}
      >
        <View className="gap-3 px-4.5 pb-2 pt-4.5">
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1 flex-row items-center gap-2">
              <CropBadge crop={listing.crop} size="sm" />
              <Text
                className="flex-1 text-emphasis capitalize text-neutral-900 dark:text-neutral-50"
                numberOfLines={1}
              >
                {theme.label}
              </Text>
            </View>
            <ListingStatusPill status={listing.status} />
          </View>

          <View className="gap-0.5">
            <Text className="text-[22px] font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
              KES {listing.pricePerKg}
              <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                /kg
              </Text>
            </Text>
            <Text className="text-sm text-neutral-600 dark:text-neutral-400">
              {listing.quantityKg} kg
            </Text>
          </View>

          <Text className="text-caption text-neutral-600 dark:text-neutral-400">
            {listing.county}
            {listing.grade ? ` · ${listing.grade}` : ""}
          </Text>

          {trimmedDescription.length > 0 ? (
            <Text
              className="border-l-2 border-neutral-300/60 pl-2.5 text-caption italic leading-relaxed text-neutral-600 dark:border-neutral-600/50 dark:text-neutral-400"
              numberOfLines={2}
            >
              &ldquo;{trimmedDescription}&rdquo;
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View className="gap-2 px-4.5 pb-4.5">
        <Button size="sm" variant="ghost" onPress={onEdit}>
          Edit
        </Button>
        <Button
          className={
            isSoldOut
              ? "opacity-45"
              : "border border-warning/30 bg-warning/10"
          }
          isDisabled={isSoldOut || isMarkingSoldOut}
          size="sm"
          variant="secondary"
          onPress={onMarkSoldOut}
        >
          {isSoldOut
            ? "Sold out"
            : isMarkingSoldOut
              ? "Updating..."
              : "Mark sold out"}
        </Button>
      </View>
    </View>
  );
}
