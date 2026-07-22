"use client";

import type {
  BuyerSearchIntent,
  BuyerSourcingListingResult,
  ChatListingLiveStatus,
} from "@repo/types";

import {
  formatListingGradeLabel,
  formatListingStatus,
  getBuyerListingDescription,
  getBuyerListingSnippet,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
  LISTING_CERTIFICATION_LABELS,
  LISTING_TAG_LABELS,
  isListingCertification,
} from "@repo/types";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import clsx from "clsx";
import { MapPin, ShoppingBag, Sparkles, Store, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

import { CropBadge } from "@/components/farmer/crop-display";

type BuyerListingDetailDialogProps = {
  /** Parsed search intent from the turn that produced this card. */
  intent?: BuyerSearchIntent | null;
  listing: BuyerSourcingListingResult | null;
  liveStatus?: ChatListingLiveStatus;
  onClose: () => void;
  onOrder: (listing: BuyerSourcingListingResult) => void;
  open: boolean;
};

function normalizeMatchHaystack(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function buildMatchReasons(
  listing: BuyerSourcingListingResult,
  intent?: BuyerSearchIntent | null,
): string[] {
  const reasons: string[] = [];
  const query = normalizeMatchHaystack(intent?.searchText ?? "");
  const cropTheme = getCropTheme(listing.crop);

  if (intent?.crop && intent.crop === listing.crop) {
    reasons.push(
      `Asked for ${cropTheme.label.toLowerCase()} — this listing is ${cropTheme.label.toLowerCase()}.`,
    );
  } else if (
    query.includes(listing.crop) ||
    query.includes(cropTheme.label.toLowerCase())
  ) {
    reasons.push(`Your ask mentioned ${cropTheme.label.toLowerCase()}.`);
  }

  if (intent?.county && intent.county === listing.county) {
    reasons.push(`County filter matched ${listing.county}.`);
  } else if (query.includes(listing.county.toLowerCase())) {
    reasons.push(`Your ask referenced ${listing.county}.`);
  }

  if (intent?.grade && listing.grade) {
    const intentGrade = formatListingGradeLabel(intent.grade).toLowerCase();
    const listingGrade = formatListingGradeLabel(listing.grade).toLowerCase();

    if (intentGrade === listingGrade || listingGrade.includes(intentGrade)) {
      reasons.push(`Grade aligned: ${formatListingGradeLabel(listing.grade)}.`);
    }
  } else if (
    listing.grade &&
    query.includes(normalizeMatchHaystack(listing.grade).trim())
  ) {
    reasons.push(
      `Grade ${formatListingGradeLabel(listing.grade)} shows up in your ask.`,
    );
  }

  if (listing.variety?.trim()) {
    const variety = listing.variety.trim();

    if (query.includes(normalizeMatchHaystack(variety).trim())) {
      reasons.push(`Variety “${variety}” matches language in your ask.`);
    }
  }

  if (listing.sizeOrCalibre?.trim()) {
    const size = listing.sizeOrCalibre.trim();

    if (query.includes(normalizeMatchHaystack(size).trim())) {
      reasons.push(`Size/calibre “${size}” overlaps your ask.`);
    }
  }

  for (const tag of listing.tags ?? []) {
    const label = LISTING_TAG_LABELS[tag];

    if (intent?.tags?.some((intentTag) => intentTag === tag)) {
      reasons.push(`Hard filter matched: ${label}.`);
      continue;
    }
    if (
      query.includes(tag.replaceAll("_", " ")) ||
      query.includes(label.toLowerCase())
    ) {
      reasons.push(`Tag “${label}” appears in your ask.`);
    }
  }

  for (const cert of listing.certifications ?? []) {
    if (!isListingCertification(cert)) {
      continue;
    }
    const label = LISTING_CERTIFICATION_LABELS[cert];

    if (
      query.includes(cert.replaceAll("_", " ")) ||
      query.includes(label.toLowerCase()) ||
      (cert === "globalgap" && query.includes("global"))
    ) {
      reasons.push(`Certification “${label}” aligns with your ask.`);
    }
  }

  if (intent?.minQuantityKg && listing.quantityKg >= intent.minQuantityKg) {
    reasons.push(
      `Supply covers your ${intent.minQuantityKg.toLocaleString()} kg need (${listing.quantityKg.toLocaleString()} kg available).`,
    );
  }

  if (intent?.maxPricePerKg && listing.pricePerKg <= intent.maxPricePerKg) {
    reasons.push(
      `Price KES ${listing.pricePerKg}/kg is within your max KES ${intent.maxPricePerKg}/kg.`,
    );
  }

  return reasons;
}

export function BuyerListingDetailDialog({
  intent = null,
  listing,
  liveStatus,
  onClose,
  onOrder,
  open,
}: BuyerListingDetailDialogProps) {
  const modalState = useOverlayState();
  const wasModalOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      modalState.open();
    } else {
      modalState.close();
    }
  }, [open, modalState]);

  useEffect(() => {
    const wasOpen = wasModalOpenRef.current;

    wasModalOpenRef.current = modalState.isOpen;

    if (wasOpen && !modalState.isOpen) {
      onClose();
    }
  }, [modalState.isOpen, onClose]);

  if (!listing) {
    return null;
  }

  const theme = getCropTheme(listing.crop);
  const description = getBuyerListingDescription(listing.description);
  const snippet = getBuyerListingSnippet(listing.snippet, description);
  const resolvedStatus = liveStatus ?? listing.status;
  const isUnavailable =
    resolvedStatus === "sold_out" ||
    resolvedStatus === "expired" ||
    resolvedStatus === "deleted";
  const canOrder = !isUnavailable && resolvedStatus === "active";
  const matchPercent = Math.round(listing.score * 100);
  const matchReasons = buildMatchReasons(listing, intent);
  const buyerQuery = intent?.searchText?.trim() || null;
  const hasMatchExplain =
    Boolean(snippet) || matchReasons.length > 0 || listing.score > 0;

  const handleOrder = () => {
    if (!canOrder) {
      return;
    }

    onOrder(listing);
    modalState.close();
  };

  return (
    <Modal state={modalState}>
      <Modal.Backdrop>
        <Modal.Container scroll="inside" size="lg">
          <Modal.Dialog
            aria-label={`${theme.label}${listing.grade ? ` · ${listing.grade}` : ""}`}
            className="flex flex-col gap-0 overflow-hidden p-0"
          >
            <Modal.Body className="m-0 flex flex-col gap-0 p-0">
              <div
                className={clsx(
                  "relative h-44 overflow-hidden sm:h-52",
                  getListingCardBgClass(listing.crop),
                )}
              >
                {listing.imageUrl ? (
                  <Image
                    fill
                    unoptimized
                    alt={`${theme.label} listing photo`}
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 512px"
                    src={listing.imageUrl}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-black/4 dark:bg-black/20">
                    <CropBadge crop={listing.crop} size="lg" />
                  </div>
                )}

                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: `url("${LISTING_CARD_NOISE_DATA_URI}")`,
                    backgroundRepeat: "repeat",
                    backgroundSize: "200px 200px",
                    opacity: LISTING_CARD_NOISE_OPACITY,
                  }}
                />

                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/45 via-black/15 to-transparent"
                />

                <Button
                  aria-label="Close"
                  className="absolute right-3 top-3 z-20 size-8 min-w-8 rounded-full bg-white/90 text-foreground shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:bg-stone-900/90"
                  size="sm"
                  variant="ghost"
                  onPress={() => modalState.close()}
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </Button>

                <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
                  {isUnavailable ? (
                    <Chip
                      className="h-auto bg-white/95 px-2 py-1 shadow-sm ring-1 ring-black/5 dark:bg-stone-900/95"
                      size="sm"
                      variant="secondary"
                    >
                      <Chip.Label className="text-[11px] font-medium">
                        {resolvedStatus === "deleted"
                          ? "No longer available"
                          : formatListingStatus(resolvedStatus)}
                      </Chip.Label>
                    </Chip>
                  ) : (
                    <Chip
                      className="h-auto bg-brand-deep px-2 py-1 text-white shadow-sm ring-1 ring-black/10"
                      size="sm"
                      variant="primary"
                    >
                      <Chip.Label className="inline-flex items-center gap-1 text-[11px] font-semibold text-white">
                        <Sparkles className="h-3 w-3" strokeWidth={2} />
                        {matchPercent}% match
                      </Chip.Label>
                    </Chip>
                  )}
                  {listing.grade ? (
                    <Chip
                      className="h-auto bg-white/95 px-2 py-1 shadow-sm ring-1 ring-black/5 dark:bg-stone-900/95"
                      size="sm"
                      variant="secondary"
                    >
                      <Chip.Label className="text-[11px] font-medium">
                        {listing.grade}
                      </Chip.Label>
                    </Chip>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-5 px-5 pb-2 pt-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <CropBadge crop={listing.crop} size="sm" />
                      <h2 className="truncate text-xl font-semibold capitalize tracking-tight text-foreground">
                        {theme.label}
                      </h2>
                    </div>
                    <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
                      <Store
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="truncate">
                        {listing.cooperativeName}
                      </span>
                    </p>
                  </div>

                  <p className="shrink-0 text-right tabular-nums">
                    <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                      KES
                    </span>
                    <span className="text-3xl font-bold leading-none tracking-tight text-foreground">
                      {listing.pricePerKg}
                    </span>
                    <span className="ml-0.5 text-sm font-medium text-muted">
                      /kg
                    </span>
                  </p>
                </div>

                <div
                  aria-label="Listing facts"
                  className="grid grid-cols-2 divide-x divide-separator overflow-hidden rounded-xl bg-background shadow-sm dark:bg-surface dark:shadow-none sm:grid-cols-2"
                  role="group"
                >
                  <div className="flex min-w-0 flex-col items-center gap-0.5 px-3 py-3 text-center">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                      Supply
                    </span>
                    <span className="w-full truncate text-base font-semibold tabular-nums tracking-tight text-foreground">
                      {listing.quantityKg.toLocaleString()} kg
                    </span>
                    <span className="text-[11px] text-muted">available</span>
                  </div>
                  <div className="flex min-w-0 flex-col items-center gap-0.5 px-3 py-3 text-center">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                      Where
                    </span>
                    <span className="inline-flex w-full max-w-full items-center justify-center gap-1 truncate text-base font-semibold tracking-tight text-foreground">
                      <MapPin
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0 text-muted"
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{listing.county}</span>
                    </span>
                    <span className="text-[11px] text-muted">County</span>
                  </div>
                </div>

                {hasMatchExplain ? (
                  <div className="relative overflow-hidden rounded-xl bg-background px-4 py-3.5 shadow-sm dark:bg-surface dark:shadow-none">
                    <div
                      aria-hidden
                      className="absolute inset-y-3 left-0 w-1 rounded-full bg-brand-deep"
                    />
                    <h3 className="mb-1.5 inline-flex items-center gap-1.5 pl-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                      <Sparkles
                        aria-hidden
                        className="h-3 w-3 text-brand-deep"
                        strokeWidth={1.75}
                      />
                      Why this matched
                      {listing.score > 0 ? (
                        <span className="font-semibold normal-case tracking-normal text-brand-deep">
                          · {matchPercent}%
                        </span>
                      ) : null}
                    </h3>
                    {buyerQuery ? (
                      <p className="mb-2 pl-2 text-xs leading-relaxed text-muted">
                        Against your ask: “{buyerQuery}”
                      </p>
                    ) : null}
                    {snippet ? (
                      <p className="pl-2 text-sm leading-relaxed text-foreground/90">
                        {snippet}
                      </p>
                    ) : null}
                    {matchReasons.length > 0 ? (
                      <ul
                        className={clsx(
                          "flex list-disc flex-col gap-1 pl-6 text-sm leading-relaxed text-foreground/90",
                          snippet && "mt-2",
                        )}
                      >
                        {matchReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : null}
                    {!snippet &&
                    matchReasons.length === 0 &&
                    listing.score > 0 ? (
                      <p className="pl-2 text-sm leading-relaxed text-foreground/90">
                        Semantic search ranked this listing highly against your
                        ask ({matchPercent}% match).
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Modal.Body>

            {canOrder ? (
              <Modal.Footer className="border-0 border-t border-separator bg-overlay p-5 pt-4 sm:px-6">
                <Button
                  className="w-full rounded-full font-semibold"
                  size="lg"
                  variant="primary"
                  onPress={handleOrder}
                >
                  <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                  Order
                </Button>
              </Modal.Footer>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
