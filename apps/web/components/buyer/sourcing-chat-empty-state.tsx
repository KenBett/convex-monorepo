"use client";

import { SourcingAgentIcon } from "@/components/buyer/sourcing-agent-icon";

const EXAMPLE_PROMPTS = [
  "50kg maize in Nakuru under 50 shillings per kg",
  "Order 5kg beans from Kenato cooperative grade 5",
  "Fresh tomatoes near Nairobi, grade 1",
] as const;

type SourcingChatEmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
};

export function SourcingChatEmptyState({
  onSelectPrompt,
}: SourcingChatEmptyStateProps) {
  return (
    <div className="motion-safe-fade-in flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8 sm:py-14">
      <div className="relative mb-6">
        <div
          aria-hidden
          className="absolute inset-0 scale-110 rounded-full bg-foreground/5 blur-xl"
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-separator bg-background shadow-sm dark:shadow-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <SourcingAgentIcon className="h-6 w-6" size={24} />
          </div>
        </div>
      </div>

      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <p className="text-eyebrow">Sourcing assistant</p>
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">
          What produce are you looking for?
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Describe quantity, location, grade, or cooperative — we&apos;ll match
          you with live listings.
        </p>
      </div>

      <div className="mt-8 flex w-full max-w-xl flex-col gap-2">
        <p className="text-center text-xs font-medium tracking-wide text-muted">
          Try an example
        </p>
        <div className="flex flex-col gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              className="rounded-[0.875rem] border border-separator bg-background px-4 py-3 text-left text-sm leading-snug text-foreground transition-colors hover:border-foreground/20 hover:bg-default/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              type="button"
              onClick={() => onSelectPrompt(prompt)}
            >
              <span className="text-muted">&ldquo;</span>
              {prompt}
              <span className="text-muted">&rdquo;</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
