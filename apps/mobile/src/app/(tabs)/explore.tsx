import { Surface, useThemeColor } from "heroui-native";
import { Compass } from "lucide-react-native";
import type { JSX } from "react";
import { Text, View } from "react-native";

import { ScreenShell } from "@/components/screen-shell";

export default function ExploreScreen(): JSX.Element {
  const foregroundColor = useThemeColor("foreground");

  return (
    <ScreenShell scrollable={false} title="Explore">
      <View className="flex-1 items-center justify-center">
        <Surface variant="default" className="shadow-elevated items-center gap-4 rounded-card p-card-lg w-full">
          <Compass color={foregroundColor} size={40} strokeWidth={1.75} />
          <Text className="text-foreground text-xl font-bold">Explore</Text>
        </Surface>
      </View>
    </ScreenShell>
  );
}
