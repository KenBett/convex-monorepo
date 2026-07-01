"use client";

import type {
  BuyerSourcingListingResult,
  ChatListingLiveStatus,
} from "@repo/types";

import {
  formatListingStatus,
  getBuyerListingDescription,
  getBuyerListingSnippet,
  getCropTheme,
  getListingCardBgClass,
} from "@repo/types";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import clsx from "clsx";
import { MapPin, ShoppingBag, Store, Tag, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { CropBadge } from "@/components/farmer/crop-display";

type BuyerListingDetailDialogProps = {
  listing: BuyerSourcingListingResult | null;
  liveStatus?: ChatListingLiveStatus;
  onClose: () => void;
  onOrder: (listing: BuyerSourcingListingResult) => void;
  open: boolean;
};

const DESCRIPTION_READ_MORE_THRESHOLD = 120;

export function BuyerListingDetailDialog({
  listing,
  liveStatus,
  onClose,
  onOrder,
  open,
}: BuyerListingDetailDialogProps) {
  const modalState = useOverlayState();
  const wasModalOpenRef = useRef(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

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

  useEffect(() => {
    if (open) {
      setDescriptionExpanded(false);
    }
  }, [open, listing?.listingId]);

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
  const showReadMore =
    description !== null &&
    description.length > DESCRIPTION_READ_MORE_THRESHOLD;

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
          <Modal.Dialog className="flex flex-col gap-0 p-6">
            <Modal.Header className="flex flex-row items-start justify-between gap-3 border-0 p-0 pb-4">
              <Modal.Heading className="flex min-w-0 items-center gap-2 text-lg font-semibold">
                <CropBadge crop={listing.crop} size="sm" />
                <span className="capitalize">{theme.label}</span>
              </Modal.Heading>
              <Button
                aria-label="Close"
                className="shrink-0"
                size="sm"
                variant="ghost"
                onPress={() => modalState.close()}
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-0 p-0">
              <div
                className={clsx(
                  "relative -mx-6 h-32 overflow-hidden sm:h-36",
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

                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  {isUnavailable ? (
                    <Chip
                      className="h-auto bg-white/95 px-1.5 py-0.5 shadow-sm ring-1 ring-black/5 dark:bg-stone-900/95"
                      size="sm"
                      variant="secondary"
                    >
                      <Chip.Label className="text-[10px]">
                        {resolvedStatus === "deleted"
                          ? "No longer available"
                          : formatListingStatus(resolvedStatus)}
                      </Chip.Label>
                    </Chip>
                  ) : (
                    <Chip
                      className="h-auto bg-white/95 px-1.5 py-0.5 shadow-sm ring-1 ring-black/5 dark:bg-stone-900/95"
                      size="sm"
                      variant="secondary"
                    >
                      <Chip.Label className="text-[10px]">
                        {Math.round(listing.score * 100)}% match
                      </Chip.Label>
                    </Chip>
                  )}
                  {listing.grade ? (
                    <Chip
                      className="h-auto bg-white/95 px-1.5 py-0.5 shadow-sm ring-1 ring-black/5 dark:bg-stone-900/95"
                      size="sm"
                      variant="secondary"
                    >
                      <Chip.Label className="text-[10px]">
                        {listing.grade}
                      </Chip.Label>
                    </Chip>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  KES {listing.pricePerKg}
                  <span className="text-base font-medium text-muted"> /kg</span>
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Chip size="sm" variant="secondary">
                    <Chip.Label>
                      {listing.quantityKg.toLocaleString()} kg available
                    </Chip.Label>
                  </Chip>
                  <Chip size="sm" variant="secondary">
                    <Chip.Label>{listing.county}</Chip.Label>
                  </Chip>
                </div>

                <div className="flex items-center gap-2 border-t border-separator pt-4">
                  <Store
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {listing.cooperativeName}
                  </span>
                  <span aria-hidden className="shrink-0 text-muted">
                    ·
                  </span>
                  <MapPin
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0 text-muted"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 truncate text-sm text-muted">
                    {listing.county} County
                  </span>
                </div>

                {description ? (
                  <div className="flex flex-col gap-1.5 border-t border-separator pt-4">
                    <h3 className="text-xs font-medium text-muted">
                      Description
                    </h3>
                    <p
                      className={clsx(
                        "text-xs leading-relaxed text-foreground/80",
                        !descriptionExpanded && showReadMore && "line-clamp-3",
                      )}
                    >
                      {description}
                    </p>
                    {showReadMore ? (
                      <button
                        className="self-start text-xs font-medium text-accent"
                        type="button"
                        onClick={() =>
                          setDescriptionExpanded((expanded) => !expanded)
                        }
                      >
                        {descriptionExpanded ? "Show less" : "Read more"}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {snippet ? (
                  <div className="flex flex-col gap-1.5 rounded-[0.875rem] bg-default px-3 py-2.5">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                      <Tag
                        aria-hidden
                        className="h-3.5 w-3.5"
                        strokeWidth={1.75}
                      />
                      Why this matched
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {snippet}
                    </p>
                  </div>
                ) : null}
              </div>
            </Modal.Body>

            {canOrder ? (
              <Modal.Footer className="border-0 p-0 pt-4">
                <Button
                  className="w-full rounded-full"
                  size="md"
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
