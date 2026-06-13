import { Surface, useThemeColor } from "heroui-native";
import { House } from "lucide-react-native";
import type { JSX } from "react";
import { Text, View } from "react-native";

import { ScreenShell } from "@/components/screen-shell";

export default function HomeScreen(): JSX.Element {
  const foregroundColor = useThemeColor("foreground");

  return (
    <ScreenShell scrollable={false} title="Home">
      <View className="flex-1 items-center justify-center">
        <Surface variant="default" className="shadow-elevated items-center gap-4 rounded-card p-card-lg w-full">
          <House color={foregroundColor} size={40} strokeWidth={1.75} />
          <Text className="text-foreground text-xl font-bold">Home</Text>
        </Surface>
      </View>
    </ScreenShell>
  );
}
