import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button, Surface } from "heroui-native";
import { Package, Scale, ShoppingBag } from "lucide-react-native";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { FarmerListingCard } from "@/components/listing-card";
import { ScreenShell } from "@/components/screen-shell";

type StatCardProps = {
  icon: typeof Package;
  label: string;
  value: string;
};

function StatCard({ icon: Icon, label, value }: StatCardProps): JSX.Element {
  return (
    <Surface className="flex-1 gap-2 rounded-[0.875rem] border border-separator p-4">
      <View className="flex-row items-center gap-2">
        <Icon color="#737373" size={14} strokeWidth={1.75} />
        <Text className="text-caption text-muted">{label}</Text>
      </View>
      <Text className="text-section-title text-foreground">{value}</Text>
    </Surface>
  );
}

export default function FarmerScreen(): JSX.Element {
  const router = useRouter();
  const listings = useQuery(api.listings.listingsByFarmer);

  const stats = useMemo(() => {
    if (!listings) {
      return null;
    }

    const activeListings = listings.filter((listing) => listing.status === "active");
    const soldOutListings = listings.filter((listing) => listing.status === "sold_out");
    const totalKgAvailable = activeListings.reduce(
      (total, listing) => total + listing.quantityKg,
      0,
    );

    return {
      activeCount: activeListings.length,
      activePreview: activeListings.slice(0, 3),
      soldOutCount: soldOutListings.length,
      totalKgAvailable,
    };
  }, [listings]);

  if (listings === undefined) {
    return (
      <ScreenShell scrollable={false} title="Dashboard">
        <View className="items-center py-8">
          <ActivityIndicator />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Dashboard">
      <View className="gap-section">
        <View className="gap-1">
          <Text className="text-page-title text-foreground">Farmer dashboard</Text>
          <Text className="text-caption text-muted">
            Your active listings and marketplace overview.
          </Text>
        </View>

        {stats ? (
          <View className="flex-row gap-3">
            <StatCard
              icon={Package}
              label="Active listings"
              value={String(stats.activeCount)}
            />
            <StatCard
              icon={Scale}
              label="Kg available"
              value={String(stats.totalKgAvailable)}
            />
            <StatCard
              icon={ShoppingBag}
              label="Sold out"
              value={String(stats.soldOutCount)}
            />
          </View>
        ) : null}

        <View className="gap-section-title">
          <View className="flex-row items-center justify-between">
            <Text className="text-section-title text-foreground">Active listings</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(farmer)/(tabs)/my-products")}
            >
              <Text className="text-sm font-medium text-accent">View all</Text>
            </Pressable>
          </View>

          {stats && stats.activePreview.length > 0 ? (
            <View className="flex-row flex-wrap gap-3">
              {stats.activePreview.map((listing) => (
                <FarmerListingCard
                  key={listing._id}
                  listing={listing}
                  listingId={listing._id}
                />
              ))}
            </View>
          ) : (
            <Surface className="items-center gap-4 rounded-[0.875rem] border border-dashed border-separator p-6">
              <Text className="text-center text-caption text-muted">
                No active listings yet. Add your first crop so buyers can find you.
              </Text>
              <Button
                size="sm"
                onPress={() => router.push("/(farmer)/(tabs)/my-products")}
              >
                Go to My Products
              </Button>
            </Surface>
          )}
        </View>

        <Surface className="gap-2 rounded-[0.875rem] border border-separator p-4">
          <Text className="text-section-title text-foreground">Recent orders</Text>
          <Text className="text-caption text-muted">
            Orders will appear here once buyers start purchasing your produce.
          </Text>
        </Surface>
      </View>
    </ScreenShell>
  );
}
