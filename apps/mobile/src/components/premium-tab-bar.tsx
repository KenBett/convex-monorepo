import type {
  PremiumTabBarProps,
  PremiumTabRoute,
} from "@/components/premium-tab-bar.types";
import * as Haptics from "expo-haptics";
import { useThemeColor } from "heroui-native";
import {
  House,
  Package,
  Search,
  ShoppingBag,
  Tractor,
  User,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { JSX } from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICONS: Record<string, LucideIcon> = {
  index: House,
  explore: Search,
  profile: User,
  "my-products": Package,
};

function getTabIcon(routeName: string, routes: PremiumTabRoute[]): LucideIcon {
  const isFarmerTabs = routes.some((route) => route.name === "my-products");
  const isBuyerTabs =
    !isFarmerTabs && routes.some((route) => route.name === "index");
  if (routeName === "index" && isFarmerTabs) {
    return Tractor;
  }
  if (routeName === "index" && isBuyerTabs) {
    return ShoppingBag;
  }
  return TAB_ICONS[routeName] ?? House;
}

type TabBarItemProps = {
  color: string;
  Icon: LucideIcon;
  isFocused: boolean;
  label: string;
  onLongPress: () => void;
  onPress: () => void;
  tabBarAccessibilityLabel?: string;
};

function TabBarItem({
  color,
  Icon,
  isFocused,
  label,
  onLongPress,
  onPress,
  tabBarAccessibilityLabel,
}: TabBarItemProps): JSX.Element {
  const handlePress = () => {
    if (Platform.OS === "ios") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      accessibilityLabel={tabBarAccessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      className="min-h-[50px] min-w-[64px] flex-1 items-center justify-center py-1"
      onLongPress={onLongPress}
      onPress={handlePress}
    >
      {({ pressed }) => (
        <View style={{ transform: [{ scale: pressed ? 0.93 : 1 }] }}>
          <Icon
            color={color}
            fill={isFocused ? color : "none"}
            size={26}
            strokeWidth={isFocused ? 2.25 : 2}
          />
        </View>
      )}
    </Pressable>
  );
}

export function PremiumTabBar({
  state,
  descriptors,
  navigation,
}: PremiumTabBarProps): JSX.Element | null {
  const insets = useSafeAreaInsets();
  const accentColor = useThemeColor("accent");
  const mutedColor = useThemeColor("muted");
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key]?.options;

  if (focusedOptions?.tabBarStyle?.display === "none") {
    return null;
  }

  return (
    <View
      className="bg-background"
      style={{ paddingBottom: Math.max(insets.bottom, 6) }}
    >
      <View className="min-h-[50px] flex-row items-center justify-around px-2 pt-1.5">
        {state.routes.map((route: PremiumTabRoute, index: number) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);
          const isFocused = state.index === index;
          const color = isFocused ? accentColor : mutedColor;
          const Icon = getTabIcon(route.name, state.routes);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TabBarItem
              key={route.key}
              color={color}
              Icon={Icon}
              isFocused={isFocused}
              label={label}
              onLongPress={onLongPress}
              onPress={onPress}
              tabBarAccessibilityLabel={options.tabBarAccessibilityLabel}
            />
          );
        })}
      </View>
    </View>
  );
}
