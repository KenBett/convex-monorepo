import type { ReactNode } from "react";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

import { mergeColors, resolveColor } from "./colors.native";
import { getIllustrationDefinition } from "./registry";
import type {
  AppIllustrationProps,
  IllustrationColors,
  IllustrationShape,
} from "./types";

function renderNativeShape(
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
        <Path
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
        <Circle
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          fill={fill}
          opacity={opacity}
          r={shape.r}
        />
      );
    case "rect":
      return (
        <Rect
          key={key}
          fill={fill}
          height={shape.height}
          opacity={opacity}
          rx={shape.rx}
          width={shape.width}
          x={shape.x}
          y={shape.y}
        />
      );
    case "ellipse":
      return (
        <Ellipse
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          fill={fill}
          opacity={opacity}
          rx={shape.rx}
          ry={shape.ry}
        />
      );
  }
}

export function AppIllustration({
  name,
  size = 160,
  colors: colorOverrides,
}: AppIllustrationProps): ReactNode {
  const definition = getIllustrationDefinition(name);
  const defaultColors: IllustrationColors = {
    primary: "#1b3022",
    highlight: "#729486",
    muted: "#b0b0b059",
  };
  const colors = mergeColors(defaultColors, colorOverrides);

  const aspectParts = definition.viewBox.split(" ").map(Number);
  const viewWidth = aspectParts[2] ?? 200;
  const viewHeight = aspectParts[3] ?? 160;
  const height = Math.round(size * (viewHeight / viewWidth));

  return (
    <Svg
      accessibilityElementsHidden
      height={height}
      importantForAccessibility="no-hide-descendants"
      viewBox={definition.viewBox}
      width={size}
    >
      {definition.shapes.map((shape, index) =>
        renderNativeShape(shape, colors, index),
      )}
    </Svg>
  );
}
