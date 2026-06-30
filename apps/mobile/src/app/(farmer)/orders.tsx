import { api } from "@repo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { JSX } from "react";
import { View } from "react-native";

import { FarmerOrdersList } from "@/components/farmer-order-card";
import { ScreenShell } from "@/components/screen-shell";

export default function FarmerOrdersScreen(): JSX.Element {
  const orders = useQuery(api.orders.ordersByFarmer);

  return (
    <ScreenShell title="Orders">
      <View className="gap-section">
        <FarmerOrdersList orders={orders} />
      </View>
    </ScreenShell>
  );
}
