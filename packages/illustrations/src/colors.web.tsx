import type { ReactNode } from "react";

import type { IllustrationColorSlot, IllustrationColors, IllustrationShape } from "./types";

export const DEFAULT_WEB_COLORS: IllustrationColors = {
  primary: "var(--illustration-primary)",
  highlight: "var(--illustration-highlight)",
  muted: "var(--illustration-muted)",
};

export function resolveColor(
  slot: IllustrationColorSlot,
  colors: IllustrationColors,
): string {
  return colors[slot];
}

export function renderWebShape(
  shape: IllustrationShape,
  colors: IllustrationColors,
  index: number,
): ReactNode {
  const fill = resolveColor(shape.slot, colors);
  const opacity = shape.opacity ?? 1;
  const key = `${shape.type}-${index}`;

  switch (shape.type) {
    case "path":
      return (
        <path
          key={key}
          d={shape.d}
          fill={fill}
          opacity={opacity}
          stroke={fill}
          strokeLinecap="round"
          strokeWidth={shape.d.length < 30 ? 2 : 0}
        />
      );
    case "circle":
      return (
        <circle
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          fill={fill}
          opacity={opacity}
        />
      );
    case "rect":
      return (
        <rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
          fill={fill}
          opacity={opacity}
        />
      );
    case "ellipse":
      return (
        <ellipse
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          rx={shape.rx}
          ry={shape.ry}
          fill={fill}
          opacity={opacity}
        />
      );
  }
}

export function mergeColors(
  overrides?: Partial<IllustrationColors>,
): IllustrationColors {
  return {
    primary: overrides?.primary ?? DEFAULT_WEB_COLORS.primary,
    highlight: overrides?.highlight ?? DEFAULT_WEB_COLORS.highlight,
    muted: overrides?.muted ?? DEFAULT_WEB_COLORS.muted,
  };
}
