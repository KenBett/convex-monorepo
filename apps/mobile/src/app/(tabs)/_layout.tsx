import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import type { JSX } from "react";

import { PremiumTabBar } from "@/components/premium-tab-bar";
import type { PremiumTabBarProps } from "@/components/premium-tab-bar.types";

export default function TabLayout(): JSX.Element {
  const backgroundColor = useThemeColor("background");

  return (
    <Tabs
      tabBar={(props) => (
        <PremiumTabBar {...(props as PremiumTabBarProps)} />
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor, flex: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Home tab",
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarAccessibilityLabel: "Explore tab",
          tabBarLabel: "Explore",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarAccessibilityLabel: "Profile tab",
          tabBarLabel: "Profile",
        }}
      />
    </Tabs>
  );
}
