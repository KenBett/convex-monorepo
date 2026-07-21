"use client";

import type { BuyerChatTrailStep } from "@repo/types";

import clsx from "clsx";
import { Check } from "lucide-react";

type BuyerChatTrailStripProps = {
  className?: string;
  steps: BuyerChatTrailStep[];
};

export function BuyerChatTrailStrip({
  className,
  steps,
}: BuyerChatTrailStripProps) {
  const visibleSteps = steps.filter((step) => step.state !== "pending");

  if (visibleSteps.length === 0) {
    return null;
  }

  return (
    <ol
      aria-label="Sourcing steps"
      className={clsx(
        "flex w-full flex-col gap-1.5 rounded-[0.875rem] bg-background px-3.5 py-3 text-sm shadow-sm dark:bg-surface dark:shadow-none",
        className,
      )}
    >
      {visibleSteps.map((step) => {
        const isActive = step.state === "active";

        return (
          <li key={step.id} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className={clsx(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                step.state === "done" && "bg-accent text-accent-foreground",
                isActive && "bg-brand-deep/15 text-brand-deep",
              )}
            >
              {step.state === "done" ? (
                <Check className="h-3 w-3" strokeWidth={2.5} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </span>
            <span className="min-w-0 flex-1 leading-snug">
              <span
                className={clsx(
                  "font-medium",
                  isActive ? "trail-step-shimmer" : "text-foreground",
                )}
              >
                {step.label}
              </span>
              {step.detail ? (
                <span className="mt-0.5 block text-xs text-muted">
                  {step.detail}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
