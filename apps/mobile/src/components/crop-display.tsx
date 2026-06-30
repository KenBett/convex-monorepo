import {
  CROP_TYPES,
  getCropIconDefinition,
  getCropTheme,
  getListingCardBgClass,
  type CropType,
} from "@repo/types";
import { Label, useThemeColor } from "heroui-native";
import { Check } from "lucide-react-native";
import type { JSX } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useAppTheme } from "@/hooks/use-app-theme";

const BADGE_SIZE_CLASS = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
} as const;

const ICON_SIZE = {
  sm: 18,
  md: 20,
  lg: 24,
} as const;

type CropBadgeProps = {
  crop: string;
  size?: "sm" | "md" | "lg";
};

export function CropIcon({
  crop,
  color,
  size,
}: {
  crop: string;
  color: string;
  size: number;
}): JSX.Element {
  const icon = getCropIconDefinition(crop);

  return (
    <Svg
      accessibilityElementsHidden
      height={size}
      importantForAccessibility="no-hide-descendants"
      viewBox={icon.viewBox}
      width={size}
    >
      {icon.paths.map((path) => (
        <Path key={path.slice(0, 24)} d={path} fill={color} />
      ))}
    </Svg>
  );
}

export function CropBadge({ crop, size = "md" }: CropBadgeProps): JSX.Element {
  const theme = getCropTheme(crop);
  const { isDark } = useAppTheme();
  const iconFill = isDark ? theme.iconFillDark : theme.iconFill;

  return (
    <View
      className={`items-center justify-center rounded-[0.65rem] ${BADGE_SIZE_CLASS[size]} ${theme.iconBadgeClass}`}
    >
      <CropIcon crop={crop} color={iconFill} size={ICON_SIZE[size]} />
    </View>
  );
}

export function CropLabel({ crop }: { crop: string }): JSX.Element {
  const theme = getCropTheme(crop);

  return (
    <View className="flex-row items-center gap-2">
      <CropBadge crop={crop} size="sm" />
      <Text className="text-emphasis">{theme.label}</Text>
    </View>
  );
}

export function cropCardClassName(crop: string): string {
  return getCropTheme(crop).cardClass;
}

type CropPickerGridProps = {
  error?: string;
  onChange: (crop: CropType) => void;
  value: CropType;
  variant?: "compact" | "expanded";
};

export function CropPickerGrid({
  error,
  onChange,
  value,
  variant = "compact",
}: CropPickerGridProps): JSX.Element {
  const backgroundColor = useThemeColor("background");
  const expanded = variant === "expanded";

  return (
    <View className={expanded ? "gap-3" : "gap-section-title"}>
      {!expanded ? <Label>Crop</Label> : null}
      <View className={`flex-row flex-wrap ${expanded ? "gap-3" : "gap-2"}`}>
        {CROP_TYPES.map((crop) => {
          const theme = getCropTheme(crop);
          const selected = value === crop;

          return (
            <Pressable
              key={crop}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              className={`relative items-center rounded-xl border ${
                expanded ? "w-[30%] gap-2.5 p-4" : "w-[23%] gap-1.5 p-2"
              } ${cropCardClassName(crop)} ${
                selected
                  ? `${getListingCardBgClass(crop)} border-transparent shadow-sm`
                  : expanded
                    ? "opacity-85"
                    : ""
              }`}
              onPress={() => {
                onChange(crop);
              }}
            >
              {selected ? (
                <View className="absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full bg-foreground/90">
                  <Check color={backgroundColor} size={12} strokeWidth={2.5} />
                </View>
              ) : null}
              <CropBadge crop={crop} size={expanded ? "lg" : "sm"} />
              <Text
                className={`text-center font-medium ${
                  expanded ? "text-sm" : "text-xs"
                }`}
              >
                {theme.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="text-caption text-danger">{error}</Text> : null}
    </View>
  );
}
