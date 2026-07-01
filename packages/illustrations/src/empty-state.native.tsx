import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { AppIllustration } from "./app-illustration.native";
import type { AppEmptyStateProps, IllustrationColors } from "./types";
import { mergeColors } from "./colors.native";

const DEFAULT_COLORS: IllustrationColors = {
  primary: "#1b3022",
  highlight: "#729486",
  muted: "#b0b0b059",
};

export function AppEmptyState({
  illustration,
  title,
  description,
  action,
  illustrationSize = 120,
  className,
  colors: colorOverrides,
}: AppEmptyStateProps): ReactNode {
  const colors = mergeColors(DEFAULT_COLORS, colorOverrides);

  return (
    <View className={["items-center gap-4", className].filter(Boolean).join(" ")}>
      <AppIllustration
        colors={colors}
        name={illustration}
        size={illustrationSize}
      />
      <View className="max-w-sm items-center gap-1.5">
        <Text className="text-center text-base font-semibold text-foreground">
          {title}
        </Text>
        {description ? (
          <Text className="text-center text-sm leading-relaxed text-muted">
            {description}
          </Text>
        ) : null}
      </View>
      {action ? <View className="pt-1">{action}</View> : null}
    </View>
  );
}

export { AppIllustration } from "./app-illustration.native";
