import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { formatOrderStatus, getCropTheme } from "@repo/types";
import { useMutation } from "convex/react";
import { Button, Chip, Surface } from "heroui-native";
import type { JSX } from "react";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppEmptyState } from "@/components/app-empty-state";

export type FarmerOrderSummary = {
  _id: Id<"orders">;
  buyerBusinessName: string;
  county: string;
  crop: string;
  quantityKg: number;
  status: string;
  totalKes: number;
};

function OrderStatusChip({ status }: { status: string }): JSX.Element {
  const label = formatOrderStatus(status);
  const isEscrowed = status === "escrowed";

  return (
    <Chip size="sm" variant={isEscrowed ? "primary" : "secondary"}>
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}

export function FarmerOrderCard({ order }: { order: FarmerOrderSummary }): JSX.Element {
  const markDelivered = useMutation(api.orders.markDelivered);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = getCropTheme(order.crop);

  const handleMarkDelivered = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await markDelivered({ orderId: order._id });
    } catch (markError) {
      setError(
        markError instanceof Error ? markError.message : "Could not update order",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Surface className="gap-3 rounded-[0.875rem] border border-separator p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-section-title capitalize text-foreground">
            {theme.label}
          </Text>
          <Text className="text-caption text-muted">{order.buyerBusinessName}</Text>
        </View>
        <OrderStatusChip status={order.status} />
      </View>

      <Text className="text-sm text-foreground">
        {order.quantityKg} kg · KES {order.totalKes} · {order.county}
      </Text>

      {order.status === "escrowed" ? (
        <Button
          isDisabled={isSubmitting}
          size="sm"
          onPress={() => void handleMarkDelivered()}
        >
          {isSubmitting ? "Updating…" : "Mark delivered"}
        </Button>
      ) : null}

      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </Surface>
  );
}

export function FarmerOrdersList({
  emptyMessage = "No orders yet. They will appear here when buyers purchase your produce.",
  limit,
  orders,
}: {
  emptyMessage?: string;
  limit?: number;
  orders: FarmerOrderSummary[] | undefined;
}): JSX.Element {
  if (orders === undefined) {
    return (
      <View className="items-center py-6">
        <Button isDisabled variant="secondary">
          Loading…
        </Button>
      </View>
    );
  }

  const visibleOrders = limit !== undefined ? orders.slice(0, limit) : orders;

  if (visibleOrders.length === 0) {
    return (
      <AppEmptyState
        description={emptyMessage}
        illustration="empty-orders"
        illustrationSize={100}
        title="No orders yet"
      />
    );
  }

  return (
    <View className="gap-3">
      {visibleOrders.map((order) => (
        <FarmerOrderCard key={order._id} order={order} />
      ))}
    </View>
  );
}
