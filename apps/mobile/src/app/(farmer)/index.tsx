import type { JSX } from "react";
import { Text, View } from "react-native";

import { ScreenShell } from "@/components/screen-shell";

export default function FarmerScreen(): JSX.Element {
  return (
    <ScreenShell title="Farmer">
      <View className="gap-2">
        <Text className="text-page-title text-foreground">Farmer dashboard</Text>
        <Text className="text-caption text-muted">
          Marketplace farmer area — Phase 1 placeholder
        </Text>
      </View>
    </ScreenShell>
  );
}
