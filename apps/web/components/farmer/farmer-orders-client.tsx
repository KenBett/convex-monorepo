"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { api } from "@repo/backend/convex/_generated/api";
import { formatOrderStatus, getCropTheme } from "@repo/types";
import { useMutation, useQuery } from "convex/react";
import { Button, Chip, Table } from "@heroui/react";
import Link from "next/link";
import { useState } from "react";

type FarmerOrderSummary = {
  _id: Id<"orders">;
  buyerBusinessName: string;
  county: string;
  crop: string;
  quantityKg: number;
  status: string;
  totalKes: number;
};

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
                  <Table.Cell className="font-medium capitalize text-foreground">
                    {theme.label}
                  </Table.Cell>
                  <Table.Cell className="text-muted">
                    {order.buyerBusinessName}
                  </Table.Cell>
                  <Table.Cell>{order.quantityKg} kg</Table.Cell>
                  <Table.Cell>KES {order.totalKes}</Table.Cell>
                  <Table.Cell>{order.county}</Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" variant={statusChipVariant(order.status)}>
                      <Chip.Label>{formatOrderStatus(order.status)}</Chip.Label>
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
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return <FarmerOrdersTable orders={visibleOrders} />;
}

export function FarmerOrdersClient() {
  const orders = useQuery(api.orders.ordersByFarmer);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Orders
        </h1>
        <p className="text-sm text-muted">
          Live orders from buyers — updates automatically when payment clears.
        </p>
      </div>

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
