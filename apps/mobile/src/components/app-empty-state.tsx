import {
  AppEmptyState as BaseAppEmptyState,
  type AppEmptyStateProps,
} from "@repo/illustrations";
import { useThemeColor } from "heroui-native";
import type { JSX } from "react";

export function AppEmptyState(props: AppEmptyStateProps): JSX.Element {
  const accent = useThemeColor("accent");
  const muted = useThemeColor("muted");

  return (
    <BaseAppEmptyState
      {...props}
      colors={{
        primary: accent,
        highlight: muted,
        muted: `${muted}59`,
      }}
    />
  );
}

export { AppIllustration } from "@repo/illustrations";
