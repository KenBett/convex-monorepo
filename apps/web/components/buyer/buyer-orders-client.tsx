"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { AppEmptyState } from "@repo/illustrations";
import { api } from "@repo/backend/convex/_generated/api";
import {
  formatDriveStatus,
  formatOrderStatus,
  getCropTheme,
} from "@repo/types";
import { useMutation, useQuery } from "convex/react";
import { Button, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import { ArrowRight, Clock3, Trash2 } from "lucide-react";
import { useState } from "react";

import { CropIcon } from "@/components/farmer/crop-display";
import { VunrLogoLoader } from "@/components/layout/vunr-logo-loader";

function orderStatusTone(status: string): string {
  switch (status) {
    case "escrowed":
      return "bg-[#0f766e] text-white ring-[#0f766e]/25";
    case "delivered":
    case "completed":
      return "bg-foreground/90 text-background ring-foreground/10";
    case "disputed":
      return "bg-[#b45309] text-white ring-[#b45309]/25";
    case "cancelled":
      return "bg-danger text-danger-foreground ring-danger/20";
    default:
      return "bg-[#142e26] text-white ring-[#142e26]/20";
  }
}

function driveStatusTone(status: string): string {
  switch (status) {
    case "assigned":
      return "bg-[#142e26] text-white ring-[#142e26]/20";
    case "picked_up":
      return "bg-[#0f766e] text-white ring-[#0f766e]/25";
    case "delivered":
      return "bg-foreground/90 text-background ring-foreground/10";
    case "cancelled":
      return "bg-danger text-danger-foreground ring-danger/20";
    default:
      return "bg-[#142e26] text-white ring-[#142e26]/20";
  }
}

function formatNeededBy(neededByMs: number, neededByLabel?: string): string {
  const formatted = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(neededByMs));

  if (neededByLabel?.trim()) {
    return `${neededByLabel.trim()} · ${formatted}`;
  }

  return formatted;
}

function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BuyerOrdersClient() {
  const orders = useQuery(api.orders.ordersByBuyer);
  const drives = useQuery(api.drives.listForBuyer);
  const deleteOrder = useMutation(api.orders.deleteOrder);
  const deleteModalState = useOverlayState();

  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"orders"> | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (orders === undefined || drives === undefined) {
    return <VunrLogoLoader />;
  }

  const driveByOrder = new Map(
    drives.map((drive) => [drive.orderId as string, drive]),
  );

  const openDelete = (orderId: Id<"orders">) => {
    setPendingDeleteId(orderId);
    setDeleteError(null);
    deleteModalState.open();
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteOrder({ orderId: pendingDeleteId });
      setPendingDeleteId(null);
      deleteModalState.close();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete order.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (orders.length === 0) {
    return (
      <AppEmptyState
        description="Orders you place in chat will show up here with live delivery status."
        illustration="empty-orders"
        title="No orders yet"
      />
    );
  }

  return (
    <>
      <Modal state={deleteModalState}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="p-6">
              <Modal.Header className="flex flex-col gap-1 border-0 p-0 pb-4">
                <Modal.Heading className="text-lg font-semibold">
                  Delete order?
                </Modal.Heading>
                <p className="text-sm text-muted">
                  This removes the order and any linked delivery job. This
                  cannot be undone.
                </p>
              </Modal.Header>
              <Modal.Body className="gap-0 p-0">
                {deleteError ? (
                  <p className="pb-4 text-sm text-danger">{deleteError}</p>
                ) : null}
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2 border-0 p-0 pt-4">
                <Button
                  isDisabled={isDeleting}
                  type="button"
                  variant="secondary"
                  onPress={() => {
                    setPendingDeleteId(null);
                    setDeleteError(null);
                    deleteModalState.close();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  isDisabled={isDeleting}
                  type="button"
                  variant="danger"
                  onPress={() => {
                    void handleDelete();
                  }}
                >
                  {isDeleting ? "Deleting…" : "Delete order"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ul className="flex flex-col gap-3">
        {orders.map((order) => {
          const drive = driveByOrder.get(order._id as string);
          const theme = getCropTheme(order.crop);
          const schedule = drive?.neededByMs
            ? formatNeededBy(drive.neededByMs, drive.neededByLabel)
            : drive?.neededByLabel
              ? `Needed by ${drive.neededByLabel}`
              : null;

          return (
            <li
              key={order._id}
              className="rounded-[0.875rem] bg-background p-2.5 shadow-sm dark:border dark:border-separator dark:bg-surface dark:shadow-none"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <CropIcon className="h-4 w-4 shrink-0" crop={order.crop} />
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                      {theme.label}
                    </p>
                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm ring-1 ring-separator dark:shadow-none">
                      {order.quantityKg} kg
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-foreground">
                      {formatKes(order.totalKes)}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold tracking-wide ring-1 ${
                        drive &&
                        (drive.status === "assigned" ||
                          drive.status === "picked_up")
                          ? driveStatusTone(drive.status)
                          : orderStatusTone(order.status)
                      }`}
                    >
                      {drive &&
                      (drive.status === "assigned" ||
                        drive.status === "picked_up")
                        ? formatDriveStatus(drive.status)
                        : formatOrderStatus(order.status)}
                    </span>
                    <Button
                      isIconOnly
                      aria-label="Delete order"
                      isDisabled={isDeleting}
                      size="sm"
                      variant="danger-soft"
                      onPress={() => openDelete(order._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Button>
                  </div>
                </div>

                {drive ? (
                  <>
                    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#142e26] text-[9px] font-bold text-white">
                        A
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">
                        {drive.pointALabel}
                        {drive.countyA !== "—" ? (
                          <span className="font-normal text-muted">
                            {" "}
                            · {drive.countyA}
                          </span>
                        ) : null}
                      </p>
                      <ArrowRight
                        aria-hidden
                        className="h-3 w-3 shrink-0 text-muted"
                        strokeWidth={2}
                      />
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#b45309] text-[9px] font-bold text-white">
                        B
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">
                        {drive.pointBLabel}
                        {drive.countyB !== "—" ? (
                          <span className="font-normal text-muted">
                            {" "}
                            · {drive.countyB}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    {schedule ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                        <Clock3
                          className="h-3.5 w-3.5 shrink-0 text-muted"
                          strokeWidth={1.75}
                        />
                        <span className="line-clamp-1 font-medium">
                          {schedule}
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : order.status === "escrowed" ? (
                  <p className="text-[11px] font-medium text-muted">
                    Delivery is being scheduled…
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
