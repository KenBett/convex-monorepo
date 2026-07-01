"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { AppEmptyState } from "@repo/illustrations";
import { api } from "@repo/backend/convex/_generated/api";
import { formatOrderStatus, getCropTheme } from "@repo/types";
import { useMutation, useQuery } from "convex/react";
import { Button, Chip, Table } from "@heroui/react";
import clsx from "clsx";
import { MapPin, Scale, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CropIcon } from "@/components/farmer/crop-display";

type FarmerOrderSummary = {
  _id: Id<"orders">;
  buyerBusinessName: string;
  county: string;
  crop: string;
  quantityKg: number;
  status: string;
  totalKes: number;
};

const ORDER_CHIP_CLASS =
  "inline-flex h-auto w-fit shrink-0 flex-nowrap items-center whitespace-nowrap px-2 py-0.5";

const ORDER_CHIP_LABEL_CLASS =
  "inline-flex shrink-0 flex-nowrap items-center gap-1.5 whitespace-nowrap";

/** Light mode: flat white chip with shadow instead of secondary/soft fill */
const ORDER_CHIP_LIGHT_SURFACE =
  "bg-background shadow-sm dark:bg-default dark:shadow-none";

function statusChipVariant(status: string): "primary" | "secondary" | "soft" {
  if (status === "escrowed") {
    return "primary";
  }
  if (status === "cancelled") {
    return "soft";
  }

  return "secondary";
}

function FarmerOrderActionCell({
  orderId,
  status,
}: {
  orderId: Id<"orders">;
  status: string;
}) {
  const markDelivered = useMutation(api.orders.markDelivered);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "escrowed") {
    return null;
  }

  const handleMarkDelivered = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await markDelivered({ orderId });
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Could not update order",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        className="w-fit rounded-full bg-accent font-medium text-accent-foreground"
        isDisabled={isSubmitting}
        size="sm"
        variant="primary"
        onPress={() => void handleMarkDelivered()}
      >
        {isSubmitting ? "Updating…" : "Mark delivered"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function FarmerOrdersTable({ orders }: { orders: FarmerOrderSummary[] }) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Orders" className="min-w-[640px]">
          <Table.Header>
            <Table.Column isRowHeader>Product</Table.Column>
            <Table.Column>Buyer</Table.Column>
            <Table.Column>Qty</Table.Column>
            <Table.Column>Total</Table.Column>
            <Table.Column>County</Table.Column>
            <Table.Column>Status</Table.Column>
            <Table.Column>Actions</Table.Column>
          </Table.Header>
          <Table.Body>
            {orders.map((order) => {
              const theme = getCropTheme(order.crop);

              return (
                <Table.Row key={order._id}>
                  <Table.Cell>
                    <Chip
                      className={clsx(ORDER_CHIP_CLASS, ORDER_CHIP_LIGHT_SURFACE)}
                      size="sm"
                      variant="secondary"
                    >
                      <Chip.Label
                        className={clsx(
                          ORDER_CHIP_LABEL_CLASS,
                          "font-medium capitalize",
                          theme.iconColorClass,
                        )}
                      >
                        <CropIcon
                          className={clsx("h-3.5 w-3.5 shrink-0", theme.iconColorClass)}
                          crop={order.crop}
                        />
                        {theme.label}
                      </Chip.Label>
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip
                      className={clsx(ORDER_CHIP_CLASS, ORDER_CHIP_LIGHT_SURFACE)}
                      size="sm"
                      variant="soft"
                    >
                      <Chip.Label className={ORDER_CHIP_LABEL_CLASS}>
                        <Store
                          aria-hidden
                          className="h-3 w-3 shrink-0 text-muted"
                          strokeWidth={1.75}
                        />
                        {order.buyerBusinessName}
                      </Chip.Label>
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip
                      className={clsx(ORDER_CHIP_CLASS, ORDER_CHIP_LIGHT_SURFACE)}
                      size="sm"
                      variant="secondary"
                    >
                      <Chip.Label className={ORDER_CHIP_LABEL_CLASS}>
                        <Scale
                          aria-hidden
                          className="h-3 w-3 shrink-0 text-muted"
                          strokeWidth={1.75}
                        />
                        {order.quantityKg} kg
                      </Chip.Label>
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip
                      className={clsx(
                        ORDER_CHIP_CLASS,
                        ORDER_CHIP_LIGHT_SURFACE,
                        "dark:bg-accent/12",
                      )}
                      size="sm"
                      variant="soft"
                    >
                      <Chip.Label className="whitespace-nowrap font-medium text-accent">
                        KES {order.totalKes}
                      </Chip.Label>
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip
                      className={clsx(ORDER_CHIP_CLASS, ORDER_CHIP_LIGHT_SURFACE)}
                      size="sm"
                      variant="soft"
                    >
                      <Chip.Label className={ORDER_CHIP_LABEL_CLASS}>
                        <MapPin
                          aria-hidden
                          className="h-3 w-3 shrink-0 text-muted"
                          strokeWidth={1.75}
                        />
                        {order.county}
                      </Chip.Label>
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip
                      className={clsx(
                        ORDER_CHIP_CLASS,
                        statusChipVariant(order.status) !== "primary" &&
                          ORDER_CHIP_LIGHT_SURFACE,
                      )}
                      size="sm"
                      variant={statusChipVariant(order.status)}
                    >
                      <Chip.Label className="whitespace-nowrap">
                        {formatOrderStatus(order.status)}
                      </Chip.Label>
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <FarmerOrderActionCell
                      orderId={order._id}
                      status={order.status}
                    />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export function FarmerOrdersList({
  emptyMessage = "No orders yet. They will appear here when buyers purchase your produce.",
  limit,
  orders,
}: {
  emptyMessage?: string;
  limit?: number;
  orders: FarmerOrderSummary[] | undefined;
}) {
  if (orders === undefined) {
    return (
      <div className="flex min-h-24 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  const visibleOrders = limit !== undefined ? orders.slice(0, limit) : orders;

  if (visibleOrders.length === 0) {
    return (
      <AppEmptyState
        description={emptyMessage}
        illustration="empty-orders"
        illustrationSize={120}
        title="No orders yet"
      />
    );
  }

  return <FarmerOrdersTable orders={visibleOrders} />;
}

export function FarmerOrdersClient() {
  const orders = useQuery(api.orders.ordersByFarmer);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        Orders
      </h1>

      <FarmerOrdersList orders={orders} />
    </div>
  );
}

export function FarmerOrdersPreview() {
  const orders = useQuery(api.orders.ordersByFarmer);

  return (
    <section className="flex flex-col gap-3 rounded-[0.875rem] border border-separator bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Recent orders</h2>
        <Link
          className="text-sm font-medium text-accent hover:underline"
          href="/farmer/orders"
        >
          View all
        </Link>
      </div>
      <FarmerOrdersList limit={3} orders={orders} />
    </section>
  );
}
