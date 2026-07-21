"use client";

import { AppIllustration } from "@repo/illustrations";

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
    <div className="motion-safe-fade-in flex flex-col gap-5 py-2">
      <AppIllustration className="mx-auto" name="empty-chat" size={140} />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm dark:shadow-none">
          <VunrLogo className="h-5 w-5" size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
            {greeting}
          </h2>
        </div>
      </div>
    </div>
  );
}
