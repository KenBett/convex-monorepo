"use client";

import type {
  BuyerOrderDraft,
  BuyerOrderDraftLine,
  BuyerSourcingListingResult,
  ChatListingLiveStatus,
} from "@repo/types";

import {
  calculateOrderTotal,
  getCropTheme,
} from "@repo/types";
import { Button, Label, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import { AlertCircle, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { CropBadge } from "@/components/farmer/crop-display";
import { formatOrderDraftIssue } from "@/lib/buyer-sourcing-intro";

export type ConfirmedOrderLine = {
  listing: BuyerSourcingListingResult;
  quantityKg: number;
};

type OrderDraftConfirmDialogProps = {
  liveStatusMap: Map<string, ChatListingLiveStatus>;
  onClose: () => void;
  onConfirm: (lines: ConfirmedOrderLine[]) => void;
  open: boolean;
  orderDraft: BuyerOrderDraft | null;
};

type EditableLine = BuyerOrderDraftLine & {
  key: string;
};

const draftCardClassName =
  "overflow-hidden rounded-[0.875rem] shadow-sm dark:bg-surface dark:text-surface-foreground dark:shadow-none";

const quantityChipClassName =
  "inline-flex h-8 w-12 items-center justify-center rounded-full bg-black px-2 dark:bg-white";

const quantityChipInputClassName =
  "w-full min-w-0 bg-transparent text-center text-sm font-semibold tabular-nums text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:text-black";

function getLineIssue(
  line: EditableLine,
  liveStatusMap: Map<string, ChatListingLiveStatus>,
): EditableLine["issue"] {
  if (line.issue) {
    return line.issue;
  }

  if (!line.listing) {
    return "not_found";
  }

  const liveStatus =
    liveStatusMap.get(line.listing.listingId) ?? line.listing.status;

  if (liveStatus === "deleted" || liveStatus === "sold_out" || liveStatus === "expired") {
    return "not_active";
  }

  if (line.listing.quantityKg < line.quantityKg) {
    return "insufficient_stock";
  }

  return undefined;
}

export function OrderDraftConfirmDialog({
  liveStatusMap,
  onClose,
  onConfirm,
  open,
  orderDraft,
}: OrderDraftConfirmDialogProps) {
  const modalState = useOverlayState();
  const wasModalOpenRef = useRef(false);
  const [lines, setLines] = useState<EditableLine[]>([]);

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
    if (!open || !orderDraft) {
      return;
    }

    setLines(
      orderDraft.lines.map((line, index) => ({
        ...line,
        key: `${line.request.crop}-${index}`,
      })),
    );
  }, [open, orderDraft]);

  const linesWithIssues = useMemo(
    () =>
      lines.map((line) => ({
        ...line,
        resolvedIssue: getLineIssue(line, liveStatusMap),
      })),
    [lines, liveStatusMap],
  );

  const confirmableLines = linesWithIssues.filter(
    (line) => line.listing && !line.resolvedIssue,
  );

  const grandTotal = confirmableLines.reduce((total, line) => {
    return total + calculateOrderTotal(line.quantityKg, line.listing!.pricePerKg);
  }, 0);

  const handleQuantityChange = (key: string, value: string) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    setLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, quantityKg: parsed } : line,
      ),
    );
  };

  const handleRemoveLine = (key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  };

  const handleConfirm = () => {
    const confirmed: ConfirmedOrderLine[] = confirmableLines.map((line) => ({
      listing: line.listing!,
      quantityKg: line.quantityKg,
    }));

    onConfirm(confirmed);
    modalState.close();
  };

  if (!orderDraft) {
    return null;
  }

  return (
    <Modal state={modalState}>
      <Modal.Backdrop>
        <Modal.Container scroll="inside" size="lg">
          <Modal.Dialog className="flex flex-col gap-0 p-6">
            <Modal.Header className="flex flex-col gap-1 border-0 p-0 pb-4">
              <Modal.Heading className="flex items-center gap-2 text-lg font-semibold">
                <ShoppingBag
                  className="h-5 w-5 text-muted"
                  strokeWidth={1.75}
                />
                Review your order
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-3 p-0">
              {linesWithIssues.length === 0 ? (
                <p className="text-sm text-muted">No order lines to review.</p>
              ) : (
                linesWithIssues.map((line) => {
                  const theme = getCropTheme(line.request.crop);
                  const issue = line.resolvedIssue;
                  const maxQty = line.listing?.quantityKg;
                  const lineTotal =
                    line.listing &&
                    calculateOrderTotal(line.quantityKg, line.listing.pricePerKg);

                  return (
                    <article key={line.key} className={draftCardClassName}>
                      <div className="flex gap-3 p-4">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                          {line.listing?.imageUrl ? (
                            <Image
                              fill
                              unoptimized
                              alt={`${theme.label} listing`}
                              className="object-cover"
                              sizes="56px"
                              src={line.listing.imageUrl}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <CropBadge crop={line.request.crop} size="sm" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-base font-semibold text-foreground">
                                {theme.label}
                              </h3>
                              {line.listing ? (
                                <>
                                  <p className="truncate text-sm text-foreground/80">
                                    {line.listing.cooperativeName}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted">
                                    {line.listing.county}
                                    {line.listing.grade
                                      ? ` · ${line.listing.grade}`
                                      : ""}
                                    {" · "}
                                    KES {line.listing.pricePerKg}/kg
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm text-muted">
                                  Requested {line.quantityKg} kg
                                </p>
                              )}
                            </div>

                            <Button
                              aria-label="Remove line"
                              isIconOnly
                              size="sm"
                              type="button"
                              variant="secondary"
                              onPress={() => handleRemoveLine(line.key)}
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {issue ? (
                        <div className="flex items-center gap-2 border-t border-separator/50 px-4 py-3 text-sm text-danger">
                          <AlertCircle
                            className="h-4 w-4 shrink-0"
                            strokeWidth={1.75}
                          />
                          {formatOrderDraftIssue(issue)}
                        </div>
                      ) : line.listing ? (
                        <div className="border-t border-separator/50 px-4 py-3">
                          <div className="flex items-end justify-between gap-4">
                            <div className="flex flex-col gap-1">
                              <Label htmlFor={`draft-qty-${line.key}`}>
                                Quantity (kg)
                              </Label>
                              <div className={quantityChipClassName}>
                                <input
                                  className={quantityChipInputClassName}
                                  id={`draft-qty-${line.key}`}
                                  inputMode="decimal"
                                  min={0}
                                  type="number"
                                  value={String(line.quantityKg)}
                                  onChange={(event) =>
                                    handleQuantityChange(
                                      line.key,
                                      event.target.value,
                                    )
                                  }
                                />
                              </div>
                              {maxQty ? (
                                <p className="text-xs text-muted">
                                  Up to {maxQty} kg available
                                </p>
                              ) : null}
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-xs text-muted">Line total</p>
                              <p className="text-xl font-semibold tracking-tight text-foreground">
                                KES {lineTotal}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}

              {confirmableLines.length > 0 ? (
                <div className={`px-4 py-4 ${draftCardClassName}`}>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted">Estimated total</p>
                      <p className="text-xs text-muted">
                        {confirmableLines.length} line
                        {confirmableLines.length === 1 ? "" : "s"} ready to
                        checkout
                      </p>
                    </div>
                    <p className="text-2xl font-semibold tracking-tight text-foreground">
                      KES {grandTotal}
                    </p>
                  </div>
                </div>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2 border-0 p-0 pt-4">
              <Button size="sm" variant="secondary" onPress={() => modalState.close()}>
                Cancel
              </Button>
              <Button
                className="rounded-full bg-accent font-medium text-accent-foreground"
                isDisabled={confirmableLines.length === 0}
                size="sm"
                variant="primary"
                onPress={handleConfirm}
              >
                Confirm order
                {confirmableLines.length > 1
                  ? ` (${confirmableLines.length} items)`
                  : ""}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
