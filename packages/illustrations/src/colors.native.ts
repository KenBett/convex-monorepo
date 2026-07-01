import type { IllustrationColorSlot, IllustrationColors, IllustrationShape } from "./types";

export function resolveColor(
  slot: IllustrationColorSlot,
  colors: IllustrationColors,
): string {
  return colors[slot];
}

export function mergeColors(
  base: IllustrationColors,
  overrides?: Partial<IllustrationColors>,
): IllustrationColors {
  return {
    primary: overrides?.primary ?? base.primary,
    highlight: overrides?.highlight ?? base.highlight,
    muted: overrides?.muted ?? base.muted,
  };
}

export type NativeShapeRenderer = (
  shape: IllustrationShape,
  colors: IllustrationColors,
  index: number,
) => React.ReactNode;
