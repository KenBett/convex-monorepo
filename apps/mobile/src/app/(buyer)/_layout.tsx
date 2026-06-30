import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useCallback, type ComponentProps, type JSX } from "react";

import { PremiumTabBar } from "@/components/premium-tab-bar";
import type { PremiumTabBarProps } from "@/components/premium-tab-bar.types";

type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>["tabBar"]>;

export default function BuyerLayout(): JSX.Element {
  const backgroundColor = useThemeColor("background");
  const renderTabBar = useCallback<TabBarRenderer>(
    (props) => <PremiumTabBar {...(props as PremiumTabBarProps)} />,
    [],
  );

  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor, flex: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarAccessibilityLabel: "Dashboard tab",
          tabBarLabel: "Dashboard",
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
