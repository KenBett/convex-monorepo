"use client";

import { VunrLogo } from "@/components/marketing/vunr-logo";

type SourcingChatEmptyStateProps = {
  firstName?: string | null;
};

export function SourcingChatEmptyState({
  firstName,
}: SourcingChatEmptyStateProps) {
  const greeting = firstName
    ? `Hey, ${firstName} — what are you sourcing today?`
    : "Hey — what are you sourcing today?";

  return (
    <div className="motion-safe-fade-in flex items-center gap-3 py-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm dark:shadow-none">
        <VunrLogo className="h-5 w-5" size={20} />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
          {greeting}
        </h2>
      </div>
    </div>
  );
}
