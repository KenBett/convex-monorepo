"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";
import type {
  BuyerOrderDraft,
  BuyerOrderDraftLine,
  BuyerSourcingListingResult,
  ChatListingLiveStatus,
} from "@repo/types";

import { api } from "@repo/backend/convex/_generated/api";
import {
  calculateOrderTotal,
  getCropTheme,
  normalizeMpesaPhone,
} from "@repo/types";
import { useAction, useMutation, useQuery } from "convex/react";
import { Button, Chip, Input, Label, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
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
  onComplete?: () => void;
  open: boolean;
  orderDraft: BuyerOrderDraft | null;
};

type EditableLine = BuyerOrderDraftLine & {
  key: string;
};

type ConfirmPhase = "review" | "paying" | "done";

const draftCardClassName =
  "overflow-hidden rounded-[0.875rem] bg-background text-foreground shadow-sm dark:bg-surface dark:text-surface-foreground dark:shadow-none";

const quantityChipClassName =
  "inline-flex h-9 w-fit shrink-0 -ml-2.5 items-center gap-0 rounded-full bg-default px-2.5 shadow-sm dark:bg-surface-secondary dark:shadow-none";

const quantityChipInputClassName =
  "w-[2.25rem] min-w-0 bg-transparent text-right text-sm font-semibold tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

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

  if (
    liveStatus === "deleted" ||
    liveStatus === "sold_out" ||
    liveStatus === "expired"
  ) {
    return "not_active";
  }

  if (line.listing.quantityKg < line.quantityKg) {
    return "insufficient_stock";
  }

  return undefined;
}

/** True for "order all of them" sentinel lines the buyer hasn't entered a quantity for yet. */
function isNeedsQuantityLine(line: EditableLine): boolean {
  return Boolean(line.listing) && line.quantityKg <= 0;
}

export function OrderDraftConfirmDialog({
  liveStatusMap,
  onClose,
  onComplete,
  open,
  orderDraft,
}: OrderDraftConfirmDialogProps) {
  const modalState = useOverlayState();
  const wasModalOpenRef = useRef(false);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [phase, setPhase] = useState<ConfirmPhase>("review");
  const [error, setError] = useState<string | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [paidCount, setPaidCount] = useState(0);

  const buyerProfile = useQuery(api.users.buyerProfile);
  const demoPaymentsEnabled = useQuery(api.orders.demoPaymentsEnabled);
  const createOrder = useMutation(api.orders.createOrder);
  const confirmDemoEscrow = useMutation(api.orders.confirmDemoEscrow);
  const initiateStkPush = useAction(api.orders.payment.initiateStkPushForOrder);

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
    setPhase("review");
    setError(null);
    setPaidCount(0);
    setMpesaPhone(buyerProfile?.phoneNumber ?? "");
  }, [open, orderDraft, buyerProfile?.phoneNumber]);

  const linesWithIssues = useMemo(
    () =>
      lines.map((line) => ({
        ...line,
        needsQuantity: isNeedsQuantityLine(line),
        resolvedIssue: getLineIssue(line, liveStatusMap),
      })),
    [lines, liveStatusMap],
  );

  const confirmableLines = linesWithIssues.filter(
    (line) => line.listing && !line.resolvedIssue && !line.needsQuantity,
  );

  const grandTotal = confirmableLines.reduce((total, line) => {
    return (
      total + calculateOrderTotal(line.quantityKg, line.listing!.pricePerKg)
    );
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

  const handleConfirmPayment = async () => {
    if (confirmableLines.length === 0) {
      return;
    }

    if (!demoPaymentsEnabled) {
      const phone = normalizeMpesaPhone(mpesaPhone);

      if (phone.length < 10) {
        setError("Enter a valid M-PESA number");

        return;
      }
    }

    setError(null);
    setPhase("paying");

    try {
      let confirmed = 0;

      for (const line of confirmableLines) {
        const listing = line.listing!;
        const orderId = await createOrder({
          listingId: listing.listingId as Id<"listings">,
          neededByLabel: orderDraft?.neededByLabel,
          neededByMs: orderDraft?.neededByMs,
          quantityKg: line.quantityKg,
        });

        if (demoPaymentsEnabled) {
          await confirmDemoEscrow({ orderId });
        } else {
          await initiateStkPush({
            mpesaPhoneNumber: normalizeMpesaPhone(mpesaPhone),
            orderId,
          });
        }

        confirmed += 1;
      }

      setPaidCount(confirmed);
      setPhase("done");
    } catch (checkoutError) {
      setPhase("review");
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not confirm payment",
      );
    }
  };

  const handleDone = () => {
    onComplete?.();
    modalState.close();
  };

  if (!orderDraft) {
    return null;
  }

  return (
    <Modal state={modalState}>
      <Modal.Backdrop>
        <Modal.Container scroll="inside" size="md">
          <Modal.Dialog className="flex flex-col gap-0 p-0">
            <Modal.Header className="border-0 px-6 pt-6 pb-4">
              <Modal.Heading className="text-xl font-semibold tracking-tight text-foreground">
                Review order
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-5 px-6 pb-2">
              {phase === "review" ? (
                <>
                  {linesWithIssues.length === 0 ? (
                    <p className="text-sm text-muted">No items to review.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {linesWithIssues.map((line) => {
                        const theme = getCropTheme(line.request.crop);
                        const issue = line.resolvedIssue;
                        const maxQty = line.listing?.quantityKg;
                        const lineTotal =
                          line.listing && line.quantityKg > 0
                            ? calculateOrderTotal(
                                line.quantityKg,
                                line.listing.pricePerKg,
                              )
                            : null;

                        return (
                          <div key={line.key} className={draftCardClassName}>
                            <div className="relative flex gap-4 p-4">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                                {line.listing?.imageUrl ? (
                                  <Image
                                    fill
                                    unoptimized
                                    alt={`${theme.label} listing`}
                                    className="object-cover"
                                    sizes="80px"
                                    src={line.listing.imageUrl}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-default/40">
                                    <CropBadge
                                      crop={line.request.crop}
                                      size="sm"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="flex min-w-0 flex-1 flex-col gap-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
                                      {theme.label}
                                    </h3>
                                    {line.listing ? (
                                      <>
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                          <span className="max-w-full truncate rounded-md bg-black px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-black">
                                            {line.listing.cooperativeName}
                                          </span>
                                          <span className="max-w-full truncate rounded-md bg-black px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-black">
                                            {line.listing.county}
                                          </span>
                                          {line.listing.grade ? (
                                            <span className="max-w-full truncate rounded-md bg-black px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-black">
                                              {line.listing.grade}
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="mt-1.5 text-sm font-semibold tabular-nums tracking-tight text-foreground">
                                          {formatKes(line.listing.pricePerKg)}
                                          <span className="font-medium text-muted">
                                            /kg
                                          </span>
                                        </p>
                                      </>
                                    ) : (
                                      <p className="mt-0.5 text-sm text-muted">
                                        Requested {line.quantityKg} kg
                                      </p>
                                    )}
                                  </div>

                                  <Button
                                    isIconOnly
                                    aria-label="Remove line"
                                    className="shrink-0 bg-background text-muted shadow-sm hover:text-foreground dark:bg-default dark:shadow-none"
                                    size="sm"
                                    type="button"
                                    variant="ghost"
                                    onPress={() => handleRemoveLine(line.key)}
                                  >
                                    <Trash2
                                      className="h-4 w-4"
                                      strokeWidth={1.75}
                                    />
                                  </Button>
                                </div>

                                {line.listing && !issue ? (
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex w-fit shrink-0 items-center gap-2">
                                      <Label
                                        className="sr-only"
                                        htmlFor={`draft-qty-${line.key}`}
                                      >
                                        Quantity in kilograms
                                      </Label>
                                      <div className={quantityChipClassName}>
                                        <input
                                          autoFocus={line.needsQuantity}
                                          className={quantityChipInputClassName}
                                          id={`draft-qty-${line.key}`}
                                          inputMode="decimal"
                                          min={0}
                                          placeholder={
                                            line.needsQuantity ? "0" : undefined
                                          }
                                          type="number"
                                          value={
                                            line.quantityKg > 0
                                              ? String(line.quantityKg)
                                              : ""
                                          }
                                          onChange={(event) =>
                                            handleQuantityChange(
                                              line.key,
                                              event.target.value,
                                            )
                                          }
                                        />
                                        <span className="pl-0.5 text-xs font-semibold text-muted">
                                          kg
                                        </span>
                                      </div>
                                      {line.needsQuantity && maxQty ? (
                                        <span className="text-[11px] text-muted">
                                          max {maxQty.toLocaleString("en-KE")}
                                        </span>
                                      ) : null}
                                    </div>

                                    {lineTotal != null ? (
                                      <p className="ml-auto text-right text-base font-semibold tabular-nums tracking-tight text-foreground">
                                        {formatKes(lineTotal)}
                                      </p>
                                    ) : null}
                                  </div>
                                ) : null}

                                {issue ? (
                                  <div className="flex items-start gap-2 text-sm text-danger">
                                    <AlertCircle
                                      className="mt-0.5 h-4 w-4 shrink-0"
                                      strokeWidth={1.75}
                                    />
                                    <span>{formatOrderDraftIssue(issue)}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {demoPaymentsEnabled === false ? (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="draft-mpesa">M-PESA number</Label>
                      <Input
                        id="draft-mpesa"
                        inputMode="tel"
                        placeholder="254712345678"
                        type="tel"
                        value={mpesaPhone}
                        onChange={(event) =>
                          setMpesaPhone(normalizeMpesaPhone(event.target.value))
                        }
                      />
                    </div>
                  ) : null}

                  {error ? (
                    <p className="text-sm text-danger">{error}</p>
                  ) : null}
                </>
              ) : null}

              {phase === "paying" ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <Loader2
                    className="h-8 w-8 animate-spin text-muted"
                    strokeWidth={1.75}
                  />
                  <p className="text-sm text-muted">
                    {demoPaymentsEnabled
                      ? "Confirming payment…"
                      : "Starting M-PESA payment…"}
                  </p>
                </div>
              ) : null}

              {phase === "done" ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Chip size="sm" variant="primary">
                    <Chip.Label>
                      {demoPaymentsEnabled
                        ? "Payment confirmed"
                        : "Payment started"}
                    </Chip.Label>
                  </Chip>
                  <p className="max-w-xs text-sm leading-relaxed text-muted">
                    {paidCount === 1
                      ? "Your order is in escrow. Track it under Track orders."
                      : `${paidCount} orders are in escrow. Track them under Track orders.`}
                  </p>
                </div>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex flex-col gap-3 border-0 px-6 pt-4 pb-6">
              {phase === "review" ? (
                <>
                  {confirmableLines.length > 0 ? (
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm text-muted">Total</span>
                      <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                        {formatKes(grandTotal)}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <Button
                      className="flex-1"
                      size="md"
                      variant="secondary"
                      onPress={() => modalState.close()}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-[1.4] rounded-full bg-accent font-medium text-accent-foreground"
                      isDisabled={confirmableLines.length === 0}
                      size="md"
                      variant="primary"
                      onPress={() => void handleConfirmPayment()}
                    >
                      {demoPaymentsEnabled
                        ? "Confirm payment"
                        : "Confirm & Pay"}
                    </Button>
                  </div>
                </>
              ) : null}

              {phase === "done" ? (
                <Button
                  className="w-full rounded-full bg-accent font-medium text-accent-foreground"
                  size="md"
                  variant="primary"
                  onPress={handleDone}
                >
                  Done
                </Button>
              ) : null}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
