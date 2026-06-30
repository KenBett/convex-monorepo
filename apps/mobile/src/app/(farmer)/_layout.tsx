import { Stack } from "expo-router";
import type { JSX } from "react";

export default function FarmerLayout(): JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
