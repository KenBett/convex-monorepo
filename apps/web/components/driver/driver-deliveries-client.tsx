"use client";

import type { Id } from "@repo/backend/convex/_generated/dataModel";

import { AppEmptyState } from "@repo/illustrations";
import { api } from "@repo/backend/convex/_generated/api";
import {
  formatDriveStatus,
  getCropTheme,
  getListingCardBgClass,
  LISTING_CARD_NOISE_DATA_URI,
  LISTING_CARD_NOISE_OPACITY,
} from "@repo/types";
import { useMutation, useQuery } from "convex/react";
import { Button, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import { MapPin, Trash2, Truck } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";

import { CropBadge, CropIcon } from "@/components/farmer/crop-display";
import { VunrLogoLoader } from "@/components/layout/vunr-logo-loader";

const DeliveryRouteMap = dynamic(
  () =>
    import("@/components/driver/delivery-route-map").then((mod) => ({
      default: mod.DeliveryRouteMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden className="h-full w-full animate-pulse bg-surface/70" />
    ),
  },
);

type MapDriveSelection = {
  crop: string;
  driveId: Id<"drives">;
  dropoffLat: number;
  dropoffLng: number;
  dropoffLabel: string;
  imageUrl?: string | null;
  neededByLabel?: string;
  neededByMs?: number;
  pickupLat: number;
  pickupLng: number;
  pickupLabel: string;
  quantityKg: number;
};

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
      return "bg-white/95 text-foreground ring-black/5 dark:bg-stone-900/95";
  }
}

function formatMapCardDate(neededByMs: number): string {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(neededByMs));
}

function formatMapCardTime(neededByMs: number): string {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(neededByMs));
}

/** Client-side fallback when older orders only stored the label. */
function resolveNeededByMsClient(
  label: string,
  nowMs = Date.now(),
): number | undefined {
  const trimmed = label.trim().toLowerCase();
  const match = trimmed.match(
    /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(morning|afternoon|evening|night))?$/,
  );

  if (!match?.[1]) {
    return undefined;
  }

  const weekdayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const periodHour: Record<string, number> = {
    morning: 9,
    afternoon: 14,
    evening: 18,
    night: 20,
  };

  const targetDow = weekdayMap[match[1]];

  if (targetDow === undefined) {
    return undefined;
  }

  const hour = match[2] ? (periodHour[match[2]] ?? 9) : 9;
  const nairobiOffsetMs = 3 * 60 * 60 * 1000;
  const shifted = new Date(nowMs + nairobiOffsetMs);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const dow = shifted.getUTCDay();

  let delta = (targetDow - dow + 7) % 7;
  const sameDayMs = Date.UTC(year, month, day, hour - 3, 0, 0, 0);

  if (delta === 0 && sameDayMs <= nowMs) {
    delta = 7;
  }

  return Date.UTC(year, month, day + delta, hour - 3, 0, 0, 0);
}

function ListingCardNoiseOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{
        backgroundImage: `url("${LISTING_CARD_NOISE_DATA_URI}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
        opacity: LISTING_CARD_NOISE_OPACITY,
      }}
    />
  );
}

function toRouteSelection(drive: {
  _id: Id<"drives">;
  crop: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  imageUrl?: string | null;
  neededByLabel?: string | null;
  neededByMs?: number | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pointALabel: string;
  pointBLabel: string;
  quantityKg: number;
}): MapDriveSelection | null {
  if (
    drive.pickupLat == null ||
    drive.pickupLng == null ||
    drive.dropoffLat == null ||
    drive.dropoffLng == null
  ) {
    return null;
  }

  const resolvedMs =
    drive.neededByMs ??
    (drive.neededByLabel
      ? resolveNeededByMsClient(drive.neededByLabel)
      : undefined);

  return {
    crop: drive.crop,
    driveId: drive._id,
    dropoffLabel: drive.pointBLabel,
    dropoffLat: drive.dropoffLat,
    dropoffLng: drive.dropoffLng,
    imageUrl: drive.imageUrl,
    neededByLabel: drive.neededByLabel ?? undefined,
    neededByMs: resolvedMs,
    pickupLabel: drive.pointALabel,
    pickupLat: drive.pickupLat,
    pickupLng: drive.pickupLng,
    quantityKg: drive.quantityKg,
  };
}

export function DriverDeliveriesClient() {
  const viewer = useQuery(api.users.viewer);
  const drives = useQuery(
    api.drives.listForDriver,
    viewer?.role === "driver" ? {} : "skip",
  );
  const enableDemoDriver = useMutation(api.users.enableDemoDriverAccount);
  const markPickedUp = useMutation(api.drives.markPickedUp);
  const markDelivered = useMutation(api.drives.markDelivered);
  const deleteDrive = useMutation(api.drives.deleteDrive);
  const deleteModalState = useOverlayState();
  const [busyDriveId, setBusyDriveId] = useState<Id<"drives"> | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"drives"> | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedDriveId, setSelectedDriveId] = useState<Id<"drives"> | null>(
    null,
  );

  useEffect(() => {
    if (!drives || drives.length === 0) {
      setSelectedDriveId(null);

      return;
    }

    const stillExists = selectedDriveId
      ? drives.some((drive) => drive._id === selectedDriveId)
      : false;

    if (stillExists) {
      return;
    }

    const firstWithRoute = drives.find((drive) => toRouteSelection(drive));

    setSelectedDriveId(firstWithRoute?._id ?? drives[0]?._id ?? null);
  }, [drives, selectedDriveId]);

  if (viewer === undefined) {
    return <VunrLogoLoader />;
  }

  if (viewer === null || viewer.role !== "driver") {
    return (
      <div className="flex max-w-md flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm text-muted">
          Turn this signed-in account into the demo driver. Jobs appear here
          after a buyer confirms demo payment.
        </p>
        <Button
          className="w-fit rounded-full bg-accent font-medium text-accent-foreground"
          size="sm"
          variant="primary"
          onPress={() => {
            setSetupError(null);
            void enableDemoDriver().catch((error: unknown) => {
              setSetupError(
                error instanceof Error
                  ? error.message
                  : "Could not enable driver account",
              );
            });
          }}
        >
          Use this account as demo driver
        </Button>
        {setupError ? (
          <p className="text-sm text-danger">{setupError}</p>
        ) : null}
        <p className="text-xs text-muted">
          Requires Convex env <code>DEMO_PAYMENTS=true</code>.
        </p>
      </div>
    );
  }

  if (drives === undefined) {
    return <VunrLogoLoader />;
  }

  if (drives.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <AppEmptyState
          description="When a buyer confirms demo payment, a job appears here with pickup and drop-off."
          illustration="empty-orders"
          title="No delivery jobs"
        />
      </div>
    );
  }

  const selectedDrive =
    drives.find((drive) => drive._id === selectedDriveId) ?? drives[0] ?? null;
  const mapSelection = selectedDrive ? toRouteSelection(selectedDrive) : null;

  const runAction = async (
    driveId: Id<"drives">,
    action: "pickup" | "deliver",
  ) => {
    setBusyDriveId(driveId);
    try {
      if (action === "pickup") {
        await markPickedUp({ driveId });
      } else {
        await markDelivered({ driveId });
      }
    } finally {
      setBusyDriveId(null);
    }
  };

  const openDelete = (driveId: Id<"drives">) => {
    setPendingDeleteId(driveId);
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
      await deleteDrive({ driveId: pendingDeleteId });
      setPendingDeleteId(null);
      deleteModalState.close();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete delivery.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal state={deleteModalState}>
        <Modal.Backdrop className="z-[2000]">
          <Modal.Container size="sm">
            <Modal.Dialog className="p-6">
              <Modal.Header className="flex flex-col gap-1 border-0 p-0 pb-4">
                <Modal.Heading className="text-lg font-semibold">
                  Delete delivery?
                </Modal.Heading>
                <p className="text-sm text-muted">
                  This removes the delivery job and its linked order. This
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
                  {isDeleting ? "Deleting…" : "Delete delivery"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <div className="flex h-full min-h-dvh flex-col gap-3 md:min-h-0 md:h-full lg:flex-row lg:gap-0 lg:overflow-hidden">
        <section className="flex min-h-0 min-w-0 flex-col px-4 pt-4 sm:px-6 lg:w-[52%] lg:overflow-y-auto lg:px-6 lg:pt-5 lg:pr-5 xl:w-[54%] xl:px-8">
          <h1 className="mb-5 flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            <Truck className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            Tracking Deliveries
          </h1>

          <ul className="flex w-full flex-col gap-3 pb-4 lg:pb-6">
            {drives.map((drive) => {
              const theme = getCropTheme(drive.crop);
              const isBusy = busyDriveId === drive._id;
              const isSelected = drive._id === selectedDriveId;
              const hasRoute = toRouteSelection(drive) != null;

              return (
                <li key={drive._id}>
                  <div
                    aria-pressed={isSelected}
                    className={`relative flex w-full cursor-pointer overflow-hidden rounded-[0.875rem] shadow-sm transition-transform duration-200 ease-out ${getListingCardBgClass(drive.crop)} ${
                      isSelected ? "z-10 scale-[1.05]" : "scale-100"
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDriveId(drive._id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedDriveId(drive._id);
                      }
                    }}
                  >
                    <ListingCardNoiseOverlay />

                    <div className="relative w-20 shrink-0 self-stretch overflow-hidden sm:w-24">
                      {drive.imageUrl ? (
                        <Image
                          fill
                          unoptimized
                          alt={`${theme.label} delivery`}
                          className="object-cover"
                          sizes="96px"
                          src={drive.imageUrl}
                        />
                      ) : (
                        <div className="flex h-full min-h-20 items-center justify-center bg-black/5 dark:bg-black/20">
                          <CropBadge crop={drive.crop} size="sm" />
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-1.5 p-2 sm:p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <CropIcon
                            className="h-4 w-4 shrink-0"
                            crop={drive.crop}
                          />
                          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                            {theme.label}
                            {drive.grade ? (
                              <span className="font-medium text-muted">
                                {" "}
                                · {drive.grade}
                              </span>
                            ) : null}
                          </p>
                          <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm ring-1 ring-separator dark:bg-surface dark:shadow-none">
                            {drive.quantityKg} kg
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <span
                            className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold tracking-wide ring-1 ${driveStatusTone(drive.status)}`}
                          >
                            {formatDriveStatus(drive.status)}
                          </span>
                          <Button
                            isIconOnly
                            aria-label="Delete delivery"
                            isDisabled={isBusy || isDeleting}
                            size="sm"
                            variant="danger-soft"
                            onClick={(event) => event.stopPropagation()}
                            onPress={() => openDelete(drive._id)}
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              strokeWidth={1.75}
                            />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {!hasRoute ? (
                            <p className="text-[11px] text-muted">
                              No map coordinates yet
                            </p>
                          ) : null}

                          {drive.status !== "delivered" &&
                          drive.status !== "cancelled" ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {drive.status === "assigned" ? (
                                <Button
                                  className="h-6 rounded-full bg-accent px-2.5 text-[11px] font-semibold text-accent-foreground"
                                  isDisabled={isBusy}
                                  size="sm"
                                  variant="primary"
                                  onClick={(event) => event.stopPropagation()}
                                  onPress={() =>
                                    void runAction(drive._id, "pickup")
                                  }
                                >
                                  Mark picked up
                                </Button>
                              ) : null}
                              {drive.status === "picked_up" ? (
                                <Button
                                  className="h-6 rounded-full px-2.5 text-[11px] font-semibold"
                                  isDisabled={isBusy}
                                  size="sm"
                                  variant="secondary"
                                  onClick={(event) => event.stopPropagation()}
                                  onPress={() =>
                                    void runAction(drive._id, "deliver")
                                  }
                                >
                                  Mark delivered
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="ml-auto w-[min(100%,12.5rem)] shrink-0 rounded-md bg-white/70 px-2 py-1 ring-1 ring-black/5 dark:bg-stone-950/50 dark:ring-white/10">
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#142e26] text-[7px] font-bold text-white">
                              A
                            </span>
                            <MapPin
                              aria-hidden
                              className="h-2.5 w-2.5 shrink-0 text-muted"
                              strokeWidth={2}
                            />
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted">
                              From
                            </span>
                            <p className="min-w-0 truncate text-[11px] font-semibold leading-none text-foreground">
                              {drive.pointALabel}
                              {drive.countyA !== "—" ? (
                                <span className="font-normal text-muted">
                                  {" "}
                                  · {drive.countyA}
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#b45309] text-[7px] font-bold text-white">
                              B
                            </span>
                            <MapPin
                              aria-hidden
                              className="h-2.5 w-2.5 shrink-0 text-muted"
                              strokeWidth={2}
                            />
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted">
                              To
                            </span>
                            <p className="min-w-0 truncate text-[11px] font-semibold leading-none text-foreground">
                              {drive.pointBLabel}
                              {drive.countyB !== "—" ? (
                                <span className="font-normal text-muted">
                                  {" "}
                                  · {drive.countyB}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="relative z-0 isolate min-h-88 w-full flex-1 overflow-hidden rounded-2xl ring-1 ring-separator max-lg:mx-4 max-lg:mb-4 sm:max-lg:mx-6 lg:mx-0 lg:mb-0 lg:min-h-0 lg:w-[48%] lg:flex-none lg:rounded-none lg:ring-0 lg:border-l lg:border-separator xl:w-[46%]">
          {mapSelection ? (
            <DeliveryRouteMap
              key={mapSelection.driveId}
              className="absolute inset-0 z-0 h-full w-full"
              crop={mapSelection.crop}
              dateLabel={
                mapSelection.neededByMs != null
                  ? formatMapCardDate(mapSelection.neededByMs)
                  : mapSelection.neededByLabel?.trim() || null
              }
              dropoff={{
                lat: mapSelection.dropoffLat,
                lng: mapSelection.dropoffLng,
              }}
              dropoffLabel={mapSelection.dropoffLabel}
              imageUrl={mapSelection.imageUrl}
              pickup={{
                lat: mapSelection.pickupLat,
                lng: mapSelection.pickupLng,
              }}
              pickupLabel={mapSelection.pickupLabel}
              quantityKg={mapSelection.quantityKg}
              timeLabel={
                mapSelection.neededByMs != null
                  ? formatMapCardTime(mapSelection.neededByMs)
                  : null
              }
              variant="expanded"
            />
          ) : (
            <div className="flex h-full min-h-88 items-center justify-center bg-surface/60 px-6 text-center lg:min-h-full">
              <p className="max-w-xs text-sm text-muted">
                This delivery has no pickup or drop-off coordinates yet. Select
                another job, or update profile locations.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
