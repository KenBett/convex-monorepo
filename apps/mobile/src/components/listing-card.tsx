import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type {
  ListingCertification,
  ListingPackaging,
  ListingStatus,
  ListingTag,
} from "@repo/types";
import {
  buildListingCardFace,
  formatListingStatus,
  getBuyerListingDescription,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "@repo/types";
import { useRouter } from "expo-router";
import type { JSX, ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { CropBadge } from "@/components/crop-display";

export type FarmerListingCardData = {
  certifications?: ListingCertification[];
  county: string;
  crop: string;
  description: string;
  grade?: string;
  harvestWindowLabel?: string;
  imageUrl?: string | null;
  minOrderKg?: number;
  packaging?: ListingPackaging;
  packUnitKg?: number;
  pricePerKg: number;
  quantityKg: number;
  sizeOrCalibre?: string;
  status: ListingStatus;
  tags?: ListingTag[];
  variety?: string;
};

type FarmerListingCardProps = {
  listing: FarmerListingCardData;
  listingId: Id<"listings">;
};

function ListingStatusMark({ status }: { status: ListingStatus }): JSX.Element {
  const isActive = status === "active";

  return (
    <View className="shrink-0 flex-row items-center gap-1">
      <View
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-600 dark:bg-emerald-400" : "bg-neutral-400"
        }`}
      />
      <Text
        className={`text-[10px] font-medium leading-none ${
          isActive
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-neutral-500 dark:text-neutral-400"
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

function QualityChips({ chips }: { chips: string[] }): JSX.Element | null {
  if (chips.length === 0) {
    return null;
  }

  return (
    <View className="min-w-0 flex-1 flex-row flex-wrap gap-1">
      {chips.map((chip, index) => (
        <View
          key={`${chip}-${index}`}
          className="max-w-full rounded-md bg-background/80 px-1.5 py-0.5 dark:bg-default/70"
        >
          <Text className="text-[10px] font-medium text-muted" numberOfLines={1}>
            {chip}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StandardsBadges({ chips }: { chips: string[] }): JSX.Element | null {
  if (chips.length === 0) {
    return null;
  }

  return (
    <View className="min-w-0 flex-1 flex-row flex-wrap gap-1">
      {chips.map((chip, index) => (
        <View
          key={`${chip}-${index}`}
          className="max-w-full flex-row items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 dark:bg-emerald-950/70"
        >
          <Text className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">
            ✓ {chip}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SpecRow({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <View className="flex-row items-start gap-1.5">
      <Text className="w-16 shrink-0 pt-0.5 text-[8px] font-medium uppercase tracking-[1px] text-muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

function visibleChips(chips: string[], max: number): string[] {
  if (chips.length <= max) {
    return chips;
  }
  const shown = chips.slice(0, max - 1);
  return [...shown, `+${chips.length - shown.length}`];
}

type FactCell = {
  hint?: string | null;
  key: string;
  label: string;
  noTruncate?: boolean;
  tone: "default" | "ready" | "supply";
  value: string;
};

function FactsStrip({ cells }: { cells: FactCell[] }): JSX.Element | null {
  if (cells.length === 0) {
    return null;
  }

  return (
    <View
      accessibilityLabel="Listing facts"
      className="flex-row overflow-hidden"
    >
      {cells.map((cell) => (
        <View
          key={cell.key}
          className={`gap-0.5 px-2 py-1.5 ${
            cell.noTruncate ? "shrink-0" : "min-w-0 flex-1"
          }`}
        >
          <Text className="text-[8px] font-medium uppercase tracking-[1px] text-muted">
            {cell.label}
          </Text>
          <Text
            className={`text-[13px] font-semibold leading-tight tracking-tight ${
              cell.tone === "ready"
                ? "text-emerald-800 dark:text-emerald-300"
                : cell.tone === "supply"
                  ? "text-neutral-950 dark:text-neutral-50"
                  : "text-neutral-900 dark:text-neutral-100"
            }`}
            numberOfLines={cell.noTruncate ? undefined : 1}
          >
            {cell.value}
          </Text>
          {cell.hint ? (
            <Text className="text-[8px] text-muted" numberOfLines={1}>
              {cell.hint}
            </Text>
          ) : null}
        </View>
      ))}
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
  const face = buildListingCardFace(listing);
  const description = getBuyerListingDescription(listing.description ?? "");
  const qualityChips = visibleChips(face.qualityChips, 4);
  const standardChips = visibleChips(face.attributeChips, 4);
  const quantityLabel = face.commerceChips[0] ?? null;
  const secondarySupply = face.commerceChips.slice(1).join(" · ") || null;
  const factCells: FactCell[] = [
    {
      key: "where",
      label: "Where",
      value: face.county,
      tone: "default",
    },
  ];
  if (face.harvestLabel) {
    factCells.push({
      key: "when",
      label: "When",
      value: face.harvestLabel,
      tone: "ready",
      noTruncate: true,
    });
  }
  if (quantityLabel) {
    factCells.push({
      key: "supply",
      label: "Supply",
      value: quantityLabel,
      tone: "supply",
      hint: secondarySupply,
    });
  }

  return (
    <Pressable
      accessibilityRole="link"
      className={`relative w-[48%] flex-col overflow-hidden rounded-[0.875rem] shadow-sm active:opacity-95 ${bgClass} ${
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

      <View className="relative aspect-16/10 w-full overflow-hidden">
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
      </View>

      <View className="gap-1.5 px-2.5 pb-2 pt-1.5">
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1 gap-px">
            <View className="flex-row items-center gap-1.5">
              <CropBadge crop={listing.crop} size="sm" />
              <Text
                className="min-w-0 flex-1 text-xs font-semibold capitalize tracking-tight text-neutral-950 dark:text-neutral-50"
                numberOfLines={1}
              >
                {theme.label}
              </Text>
              <ListingStatusMark status={listing.status} />
            </View>
            {face.variety ? (
              <Text
                className="text-[9px] text-neutral-500 dark:text-neutral-400"
                numberOfLines={1}
              >
                {face.variety}
              </Text>
            ) : null}
          </View>
          <Text className="shrink-0 text-base font-semibold leading-none tracking-tight text-neutral-950 dark:text-neutral-50">
            <Text className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400">
              KES{" "}
            </Text>
            {face.pricePerKg}
            <Text className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400">
              /kg
            </Text>
          </Text>
        </View>

        {factCells.length > 0 ||
        qualityChips.length > 0 ||
        standardChips.length > 0 ? (
          <View className="overflow-hidden rounded-md bg-surface shadow-sm dark:shadow-none">
            <FactsStrip cells={factCells} />
            {qualityChips.length > 0 || standardChips.length > 0 ? (
              <View className="gap-1.5 px-2 py-1.5">
                {qualityChips.length > 0 ? (
                  <SpecRow title="Quality">
                    <QualityChips chips={qualityChips} />
                  </SpecRow>
                ) : null}
                {standardChips.length > 0 ? (
                  <SpecRow title="Standards">
                    <StandardsBadges chips={standardChips} />
                  </SpecRow>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {description ? (
          <Text
            className="px-0.5 text-[10px] italic leading-snug text-muted"
            numberOfLines={2}
          >
            <Text className="not-italic font-medium uppercase tracking-[1px] text-muted">
              Seller ·{" "}
            </Text>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
