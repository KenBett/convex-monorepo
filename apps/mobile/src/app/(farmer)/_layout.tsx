import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import type { JSX } from "react";

export default function FarmerLayout(): JSX.Element {
  const backgroundColor = useThemeColor("background");

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor },
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="listings/[id]"
        options={{
          headerShown: true,
          headerBackTitle: "Back",
          title: "Listing",
        }}
      />
      <Stack.Screen
        name="orders"
        options={{
          headerShown: true,
          headerBackTitle: "Back",
          title: "Orders",
        }}
      />
    </Stack>
  );
}
