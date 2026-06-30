import type { ListingStatus } from "@repo/types";
import { formatListingStatus, getCropTheme } from "@repo/types";
import { Button } from "heroui-native";
import type { JSX } from "react";
import { Text, View } from "react-native";

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
  isMarkingSoldOut?: boolean;
  onEdit: () => void;
  onMarkSoldOut: () => void;
};

function ListingStatusPill({ status }: { status: ListingStatus }): JSX.Element {
  const isActive = status === "active";

  return (
    <View
      className={`flex-row shrink-0 items-center gap-1.5 rounded-full px-2 py-1 ${
        isActive ? "bg-success/10" : "bg-default"
      }`}
    >
      <View
        className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-success" : "bg-muted"}`}
      />
      <Text
        className={`text-[11px] font-medium leading-none ${
          isActive ? "text-success" : "text-muted"
        }`}
      >
        {formatListingStatus(status)}
      </Text>
    </View>
  );
}

export function FarmerListingCard({
  listing,
  isMarkingSoldOut = false,
  onEdit,
  onMarkSoldOut,
}: FarmerListingCardProps): JSX.Element {
  const theme = getCropTheme(listing.crop);
  const isSoldOut = listing.status === "sold_out";
  const trimmedDescription = listing.description.trim();

  return (
    <View
      className={`w-[48%] gap-3 rounded-[0.875rem] border border-separator bg-surface p-4.5 shadow-elevated ${
        isSoldOut ? "opacity-90" : ""
      }`}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <CropBadge crop={listing.crop} size="sm" />
          <Text
            className="flex-1 text-emphasis capitalize text-foreground"
            numberOfLines={1}
          >
            {theme.label}
          </Text>
        </View>
        <ListingStatusPill status={listing.status} />
      </View>

      <View className="gap-0.5">
        <Text className="text-[22px] font-semibold leading-tight text-foreground">
          KES {listing.pricePerKg}
          <Text className="text-sm font-medium text-muted">/kg</Text>
        </Text>
        <Text className="text-sm text-muted">{listing.quantityKg} kg</Text>
      </View>

      <Text className="text-caption text-muted">
        {listing.county}
        {listing.grade ? ` · ${listing.grade}` : ""}
      </Text>

      {trimmedDescription.length > 0 ? (
        <Text
          className="border-l-2 border-separator pl-2.5 text-caption italic leading-relaxed text-muted"
          numberOfLines={2}
        >
          &ldquo;{trimmedDescription}&rdquo;
        </Text>
      ) : null}

      <View className="gap-2 pt-0.5">
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
