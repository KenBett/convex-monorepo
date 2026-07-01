import { AppIllustration as BaseAppIllustration, type AppIllustrationProps } from "@repo/illustrations";
import { useThemeColor } from "heroui-native";
import type { JSX } from "react";

export function AppIllustration(
  props: Omit<AppIllustrationProps, "colors">,
): JSX.Element {
  const accent = useThemeColor("accent");
  const muted = useThemeColor("muted");

  return (
    <BaseAppIllustration
      {...props}
      colors={{
        primary: accent,
        highlight: muted,
        muted: `${muted}59`,
      }}
    />
  );
}
