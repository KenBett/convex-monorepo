"use client";

import { AppIllustration } from "@repo/illustrations";

import { VunrLogo } from "@/components/marketing/vunr-logo";

export function SourcingChatEmptyState() {
  return (
    <div className="motion-safe-fade-in flex flex-col gap-5 py-2">
      <AppIllustration className="mx-auto" name="empty-chat" size={140} />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm dark:shadow-none">
          <VunrLogo className="h-5 w-5" size={20} />
        </div>
        <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
          What produce are you looking for?
        </h2>
      </div>
    </div>
  );
}
