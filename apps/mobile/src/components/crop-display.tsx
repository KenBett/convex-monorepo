import {
  CROP_TYPES,
  getCropIconDefinition,
  getCropTheme,
  type CropType,
} from "@repo/types";
import { Label } from "heroui-native";
import type { JSX } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useAppTheme } from "@/hooks/use-app-theme";

const BADGE_SIZE_CLASS = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
} as const;

const ICON_SIZE = {
  sm: 18,
  md: 20,
} as const;

type CropBadgeProps = {
  crop: string;
  size?: "sm" | "md";
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
};

export function CropPickerGrid({
  error,
  onChange,
  value,
}: CropPickerGridProps): JSX.Element {
  return (
    <View className="gap-section-title">
      <Label>Crop</Label>
      <View className="flex-row flex-wrap gap-2">
        {CROP_TYPES.map((crop) => {
          const theme = getCropTheme(crop);
          const selected = value === crop;

          return (
            <Pressable
              key={crop}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              className={`w-[23%] items-center gap-1.5 rounded-lg border p-2 ${cropCardClassName(crop)} ${
                selected ? "border-foreground border-2" : ""
              }`}
              onPress={() => {
                onChange(crop);
              }}
            >
              <CropBadge crop={crop} size="sm" />
              <Text className="text-center text-xs font-medium">{theme.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="text-caption text-danger">{error}</Text> : null}
    </View>
  );
}
