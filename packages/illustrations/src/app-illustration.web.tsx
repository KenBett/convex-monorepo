import type { ReactNode } from "react";

import { mergeColors, renderWebShape } from "./colors.web";
import { getIllustrationDefinition } from "./registry";
import type { AppIllustrationProps } from "./types";

export function AppIllustration({
  name,
  size = 160,
  className,
  colors: colorOverrides,
}: AppIllustrationProps): ReactNode {
  const definition = getIllustrationDefinition(name);
  const colors = mergeColors(colorOverrides);
  const aspectParts = definition.viewBox.split(" ").map(Number);
  const viewWidth = aspectParts[2] ?? 200;
  const viewHeight = aspectParts[3] ?? 160;
  const height = Math.round(size * (viewHeight / viewWidth));

  return (
    <svg
      aria-hidden
      className={className}
      height={height}
      role="img"
      viewBox={definition.viewBox}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {definition.shapes.map((shape, index) =>
        renderWebShape(shape, colors, index),
      )}
    </svg>
  );
}
