"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { api } from "@repo/backend/convex/_generated/api";
import {
  calculateOrderTotal,
  formatOrderCancelledReason,
  formatOrderStatus,
  getCropTheme,
  normalizeMpesaPhone,
  parseOrderForm,
  type BuyerSourcingListingResult,
  type ListingSearchResult,
} from "@repo/types";
import { useAction, useMutation, useQuery } from "convex/react";
import { Button, Chip, Input, Label, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import { Loader2, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type OrderCheckoutListing =
  | BuyerSourcingListingResult
  | ListingSearchResult;

type OrderCheckoutDialogProps = {
  defaultQuantityKg?: number;
  listing: OrderCheckoutListing | null;
  onClose: () => void;
  onCheckoutComplete?: () => void;
  open: boolean;
  stepLabel?: string;
};

type CheckoutPhase = "form" | "paying" | "done";

function getDefaultQuantity(
  listing: OrderCheckoutListing,
  minFromIntent?: number,
): number {
  const max = listing.quantityKg;

  if (
    minFromIntent !== undefined &&
    minFromIntent > 0 &&
    minFromIntent <= max
  ) {
    return minFromIntent;
  }

  return max;
}

export function OrderCheckoutDialog({
  defaultQuantityKg,
  listing,
  onClose,
  onCheckoutComplete,
  open,
  stepLabel,
}: OrderCheckoutDialogProps) {
  const modalState = useOverlayState();
  const buyerProfile = useQuery(api.users.buyerProfile);
  const createOrder = useMutation(api.orders.createOrder);
  const initiateStkPush = useAction(api.orders.payment.initiateStkPushForOrder);
  const cancelOrder = useMutation(api.orders.cancelOrder);

  const [quantityKg, setQuantityKg] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [orderId, setOrderId] = useState<Id<"orders"> | null>(null);
  const [phase, setPhase] = useState<CheckoutPhase>("form");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const order = useQuery(api.orders.getOrder, orderId ? { orderId } : "skip");
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

  useEffect(() => {
    if (!open || !listing) {
      return;
    }

    setQuantityKg(String(getDefaultQuantity(listing, defaultQuantityKg)));
    setMpesaPhone(buyerProfile?.phoneNumber ?? "");
    setOrderId(null);
    setPhase("form");
    setError(null);
    setFieldErrors({});
  }, [open, listing, defaultQuantityKg, buyerProfile?.phoneNumber]);

  useEffect(() => {
    if (!order || phase !== "paying") {
      return;
    }

    if (order.status === "escrowed") {
      setPhase("done");
    } else if (order.status === "cancelled") {
      setPhase("done");
    }
  }, [order, phase]);

  const parsedQuantity = useMemo(() => {
    const value = Number.parseFloat(quantityKg);

    return Number.isFinite(value) ? value : 0;
  }, [quantityKg]);

  const totalKes = listing
    ? calculateOrderTotal(parsedQuantity, listing.pricePerKg)
    : 0;

  const handleConfirmPay = async () => {
    if (!listing) {
      return;
    }

    const parsed = parseOrderForm({
      mpesaPhoneNumber: mpesaPhone,
      quantityKg,
    });

    if (!parsed.success) {
      setFieldErrors(parsed.errors);

      return;
    }

    if (parsed.data.quantityKg > listing.quantityKg) {
      setFieldErrors({
        quantityKg: `Maximum available is ${listing.quantityKg} kg`,
      });

      return;
    }

    setFieldErrors({});
    setError(null);
    setPhase("paying");

    try {
      const newOrderId = await createOrder({
        listingId: listing.listingId as Id<"listings">,
        quantityKg: parsed.data.quantityKg,
      });

      setOrderId(newOrderId);

      await initiateStkPush({
        mpesaPhoneNumber: parsed.data.mpesaPhoneNumber,
        orderId: newOrderId,
      });
    } catch (checkoutError) {
      setPhase("form");
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not start payment",
      );
    }
  };

  const handleCancelPending = async () => {
    if (!orderId) {
      onClose();

      return;
    }

    try {
      await cancelOrder({ orderId });
    } catch {
      // Order may already have moved past pending.
    }
    onClose();
  };

  if (!listing) {
    return null;
  }

  const theme = getCropTheme(listing.crop);
  const isPendingPayment = phase === "paying" && order?.status === "pending";
  const isSuccess = order?.status === "escrowed";
  const isCancelled = order?.status === "cancelled";

  return (
    <Modal state={modalState}>
      <Modal.Backdrop>
        <Modal.Container scroll="inside" size="md">
          <Modal.Dialog className="flex flex-col gap-0 p-6">
            <Modal.Header className="flex flex-col gap-1 border-0 p-0 pb-4">
              <Modal.Heading className="flex items-center gap-2 text-lg font-semibold">
                <ShoppingBag
                  className="h-5 w-5 text-muted"
                  strokeWidth={1.75}
                />
                Order {theme.label}
              </Modal.Heading>
              <p className="text-sm text-muted">
                {stepLabel ? `${stepLabel} · ` : ""}
                {listing.cooperativeName} · {listing.county}
              </p>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-4 p-0">
              {phase === "form" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="order-quantity">Quantity (kg)</Label>
                    <Input
                      id="order-quantity"
                      inputMode="decimal"
                      min={0}
                      placeholder={`Up to ${listing.quantityKg} kg`}
                      type="number"
                      value={quantityKg}
                      onChange={(event) => setQuantityKg(event.target.value)}
                    />
                    {fieldErrors.quantityKg ? (
                      <p className="text-xs text-danger">
                        {fieldErrors.quantityKg}
                      </p>
                    ) : (
                      <p className="text-xs text-muted">
                        {listing.quantityKg} kg available · server validates
                        live stock
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="order-mpesa">M-PESA number</Label>
                    <Input
                      id="order-mpesa"
                      inputMode="tel"
                      placeholder="254712345678"
                      type="tel"
                      value={mpesaPhone}
                      onChange={(event) =>
                        setMpesaPhone(normalizeMpesaPhone(event.target.value))
                      }
                    />
                    {fieldErrors.mpesaPhoneNumber ? (
                      <p className="text-xs text-danger">
                        {fieldErrors.mpesaPhoneNumber}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-[0.875rem] border border-separator p-4">
                    <p className="text-sm text-muted">Total</p>
                    <p className="text-2xl font-semibold tracking-tight text-foreground">
                      KES {totalKes}
                    </p>
                    <p className="text-xs text-muted">
                      {parsedQuantity || "—"} kg × KES {listing.pricePerKg}/kg
                    </p>
                  </div>

                  {error ? (
                    <p className="text-sm text-danger">{error}</p>
                  ) : null}
                </>
              ) : null}

              {phase === "paying" && isPendingPayment ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <Loader2
                    className="h-8 w-8 animate-spin text-muted"
                    strokeWidth={1.75}
                  />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">
                      Check your phone for the M-PESA prompt
                    </p>
                    <p className="text-xs text-muted">
                      Enter your PIN to complete payment. This may take up to a
                      minute.
                    </p>
                  </div>
                  <Chip size="sm" variant="secondary">
                    <Chip.Label>{formatOrderStatus("pending")}</Chip.Label>
                  </Chip>
                </div>
              ) : null}

              {phase === "done" && isSuccess ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Chip size="sm" variant="primary">
                    <Chip.Label>Payment received</Chip.Label>
                  </Chip>
                  <p className="text-sm text-foreground">
                    Your order of {order.quantityKg} kg {theme.label} is in
                    escrow. The farmer has been notified.
                  </p>
                  {order.mpesaReceiptNumber ? (
                    <p className="text-xs text-muted">
                      Receipt: {order.mpesaReceiptNumber}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {phase === "done" && isCancelled ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Chip size="sm" variant="secondary">
                    <Chip.Label>{formatOrderStatus("cancelled")}</Chip.Label>
                  </Chip>
                  <p className="text-sm text-foreground">
                    {formatOrderCancelledReason(order.cancelledReason)}
                  </p>
                </div>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2 border-0 p-0 pt-4">
              {phase === "form" ? (
                <>
                  <Button size="sm" variant="secondary" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    className="rounded-full bg-accent font-medium text-accent-foreground"
                    isDisabled={parsedQuantity <= 0 || totalKes <= 0}
                    size="sm"
                    variant="primary"
                    onPress={() => void handleConfirmPay()}
                  >
                    Confirm &amp; Pay
                  </Button>
                </>
              ) : null}

              {phase === "paying" && isPendingPayment ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => void handleCancelPending()}
                >
                  Cancel order
                </Button>
              ) : null}

              {phase === "done" ? (
                <Button
                  className="rounded-full bg-accent font-medium text-accent-foreground"
                  size="sm"
                  variant="primary"
                  onPress={() => {
                    if (isSuccess) {
                      onCheckoutComplete?.();
                      return;
                    }
                    onClose();
                  }}
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
