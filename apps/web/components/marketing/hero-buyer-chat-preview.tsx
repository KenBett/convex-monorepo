"use client";

import type { BuyerSourcingListingResult } from "@repo/types";

import { Avatar, Card } from "@heroui/react";

import { BuyerListingCard } from "@/components/buyer/buyer-listing-card";
import { SourcingSendIcon } from "@/components/buyer/sourcing-agent-icon";
import { VunrLogo } from "@/components/marketing/vunr-logo";

const HERO_USER_QUERY =
  "50kg maize in Nakuru under 50 shillings per kg";

const HERO_ASSISTANT_INTRO = "Here are 2 matching listings below.";

const HERO_MOCK_LISTINGS: BuyerSourcingListingResult[] = [
  {
    cooperativeName: "Nakuru Farmers Co-op",
    county: "Nakuru",
    crop: "maize",
    description: "Grade 1 maize, freshly harvested.",
    grade: "Grade 1",
    listingId: "hero-preview-maize",
    pricePerKg: 48,
    quantityKg: 120,
    score: 0.92,
    snippet: "Grade 1 maize in Nakuru",
    status: "active",
  },
  {
    cooperativeName: "Rift Valley Growers",
    county: "Nakuru",
    crop: "maize",
    description: "Clean dry maize, ready for pickup.",
    grade: "Grade 2",
    listingId: "hero-preview-maize-2",
    pricePerKg: 46,
    quantityKg: 200,
    score: 0.86,
    snippet: "Maize in Nakuru under budget",
    status: "active",
  },
];

const ELEVATED_SURFACE =
  "rounded-xl bg-surface text-surface-foreground shadow-sm";

const COMPOSER_SURFACE =
  "rounded-2xl bg-background shadow-sm";

const COMPOSER_INPUT =
  "min-h-10 w-full resize-none bg-transparent px-3 py-2 pr-12 text-sm leading-5 text-foreground outline-none placeholder:text-muted";

export function HeroBuyerChatPreview() {
  return (
    <div
      aria-hidden
      className="hero-buyer-chat-preview light pointer-events-none mx-auto w-full min-w-0 rounded-[1.5rem] border border-separator bg-background p-2.5 text-left shadow-sm sm:rounded-[1.75rem] sm:p-3"
      data-theme="light"
    >
      <Card className="w-full min-w-0 rounded-card bg-surface text-surface-foreground shadow-sm">
        <Card.Content className="flex min-w-0 flex-col gap-2.5 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5">
          <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3">
            <div className="flex min-w-0 justify-end gap-2">
              <div className="flex min-w-0 w-full flex-col items-end sm:max-w-[92%]">
                <div className="rounded-xl bg-accent px-3 py-2 text-sm leading-5 text-accent-foreground shadow-sm">
                  <p className="whitespace-pre-wrap">{HERO_USER_QUERY}</p>
                </div>
              </div>
              <Avatar className="shrink-0 shadow-sm" size="sm">
                <Avatar.Fallback className="text-xs font-semibold">BK</Avatar.Fallback>
              </Avatar>
            </div>

            <div className="flex min-w-0 gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm">
                <VunrLogo className="h-3.5 w-3.5" size={14} />
              </div>

              <div className="flex min-w-0 w-full flex-col gap-2 sm:max-w-[92%]">
                <div className={`px-3 py-2 text-sm leading-5 ${ELEVATED_SURFACE}`}>
                  <p>{HERO_ASSISTANT_INTRO}</p>
                </div>

                <ol className="grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5 sm:gap-3">
                  {HERO_MOCK_LISTINGS.map((listing) => (
                    <li key={listing.listingId} className="min-w-0">
                      <BuyerListingCard
                        forceLight
                        result={listing}
                        onOrder={() => {}}
                      />
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <div className={`relative ${COMPOSER_SURFACE}`}>
            <textarea
              readOnly
              aria-hidden
              className={COMPOSER_INPUT}
              placeholder="Describe what you need…"
              rows={1}
              tabIndex={-1}
              value=""
            />
            <span className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm">
              <SourcingSendIcon size={14} />
            </span>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
