import type { ReactNode } from "react";

import { AppIllustration } from "./app-illustration.web";
import type { AppEmptyStateProps } from "./types";

export function AppEmptyState({
  illustration,
  title,
  description,
  action,
  illustrationSize = 140,
  className,
}: AppEmptyStateProps): ReactNode {
  return (
    <div
      className={[
        "motion-safe-fade-in flex flex-col items-center gap-4 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <AppIllustration name={illustration} size={illustrationSize} />
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export { AppIllustration } from "./app-illustration.web";
export type {
  AppEmptyStateProps,
  AppIllustrationProps,
  IllustrationName,
} from "./types";
export { ILLUSTRATION_NAMES } from "./types";
