import type { JSX } from "react";
import { Text, View } from "react-native";

import { ScreenShell } from "@/components/screen-shell";

export default function BuyerScreen(): JSX.Element {
  return (
    <ScreenShell title="Buyer">
      <View className="gap-2">
        <Text className="text-page-title text-foreground">Buyer dashboard</Text>
        <Text className="text-caption text-muted">
          Marketplace buyer area — Phase 1 placeholder
        </Text>
      </View>
    </ScreenShell>
  );
}
