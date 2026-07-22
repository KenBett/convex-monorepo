"use client";

import type { BuyerChatTrailStep, BuyerChatTrailStepId } from "@repo/types";

import clsx from "clsx";
import { Check } from "lucide-react";

type BuyerChatTrailStripProps = {
  className?: string;
  steps: BuyerChatTrailStep[];
};

/** Steps that gain a detail line when the trail completes — reserve height up front. */
const DETAIL_SLOT_STEP_IDS = new Set<BuyerChatTrailStepId>([
  "search",
  "filter",
  "rank",
]);

export function BuyerChatTrailStrip({
  className,
  steps,
}: BuyerChatTrailStripProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <ol
      aria-label="Sourcing steps"
      className={clsx(
        "flex w-full flex-col gap-1 rounded-[0.875rem] bg-background px-3 py-2.5 text-xs shadow-sm dark:bg-surface dark:shadow-none",
        className,
      )}
    >
      {steps.map((step) => {
        const isActive = step.state === "active";
        const isPending = step.state === "pending";
        const isDone = step.state === "done";
        const showDetailSlot =
          DETAIL_SLOT_STEP_IDS.has(step.id) || Boolean(step.detail);

        return (
          <li key={step.id} className="flex items-start gap-2">
            <span
              aria-hidden
              className={clsx(
                "mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                isDone && "bg-accent text-accent-foreground",
                isActive && "bg-brand-deep/15 text-brand-deep",
                isPending && "bg-default text-muted",
              )}
            >
              {isDone ? (
                <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
              ) : (
                <span className="h-1 w-1 rounded-full bg-current" />
              )}
            </span>
            <span className="min-w-0 flex-1 leading-snug">
              <span
                className={clsx(
                  "font-medium",
                  isActive && "trail-step-shimmer",
                  isDone && "text-foreground",
                  isPending && "text-muted",
                )}
              >
                {step.label}
              </span>
              {showDetailSlot ? (
                <span
                  className={clsx(
                    "mt-0.5 block min-h-3.5 text-[10px] leading-tight",
                    step.detail ? "text-muted" : "text-transparent",
                  )}
                >
                  {step.detail || "\u00a0"}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
