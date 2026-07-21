"use client";

import type { LocationPin } from "@/components/location/location-pin-map";

import { isValidKenyaLatLng } from "@repo/types";
import { Button, useOverlayState } from "@heroui/react";
import { Modal } from "@heroui/react/modal";
import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const LocationPinMap = dynamic(
  () =>
    import("@/components/location/location-pin-map").then(
      (mod) => mod.LocationPinMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden className="h-full w-full animate-pulse bg-surface/70" />
    ),
  },
);

function parsePin(lat: string, lng: string): LocationPin | null {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (!isValidKenyaLatLng(parsedLat, parsedLng)) {
    return null;
  }

  return { lat: parsedLat, lng: parsedLng };
}

function formatCoord(value: number): string {
  return value.toFixed(5);
}

type ProfileLocationPickerProps = {
  locationLat: string;
  locationLng: string;
  onLocationChange: (lat: string, lng: string) => void;
};

export function ProfileLocationPicker({
  locationLat,
  locationLng,
  onLocationChange,
}: ProfileLocationPickerProps) {
  const mapModalState = useOverlayState();
  const savedPin = parsePin(locationLat, locationLng);
  const [draftPin, setDraftPin] = useState<LocationPin | null>(savedPin);
  const [mapSessionKey, setMapSessionKey] = useState(0);
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapModalState.isOpen) {
      return;
    }
    setDraftPin(parsePin(locationLat, locationLng));
    setPickerError(null);
  }, [mapModalState.isOpen, locationLat, locationLng]);

  const handleOpen = () => {
    const pin = parsePin(locationLat, locationLng);

    if (!pin) {
      setPickerError(
        "Set a valid Kenya latitude (−5 to 5.5) and longitude (33.5 to 42) first, or pick a county.",
      );

      return;
    }
    setDraftPin(pin);
    setMapSessionKey((key) => key + 1);
    setPickerError(null);
    mapModalState.open();
  };

  const handleSave = () => {
    if (!draftPin || !isValidKenyaLatLng(draftPin.lat, draftPin.lng)) {
      setPickerError("Tap the map inside Kenya to place your pin, then save.");

      return;
    }
    onLocationChange(formatCoord(draftPin.lat), formatCoord(draftPin.lng));
    setPickerError(null);
    mapModalState.close();
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3 rounded-lg bg-background px-3 py-3 shadow-sm dark:bg-surface dark:shadow-none">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Map pin</p>
            {savedPin ? (
              <p className="mt-1 truncate text-xs text-muted">
                {formatCoord(savedPin.lat)}, {formatCoord(savedPin.lng)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                No valid pin yet — choose a county, then pick on the map.
              </p>
            )}
          </div>
          <Button
            className="shrink-0 rounded-full"
            size="sm"
            type="button"
            variant="secondary"
            onPress={handleOpen}
          >
            <MapPin className="size-3.5" />
            Pick on map
          </Button>
        </div>
        {pickerError && !mapModalState.isOpen ? (
          <p className="text-xs text-danger">{pickerError}</p>
        ) : null}
        <p className="text-xs text-muted">
          Open the map, tap a point, then save to set latitude and longitude.
        </p>
      </div>

      <Modal state={mapModalState}>
        <Modal.Backdrop isDismissable>
          <Modal.Container
            className="w-[min(96vw,80rem)]! max-w-[min(96vw,80rem)]!"
            placement="center"
            size="cover"
          >
            <Modal.Dialog className="relative h-[min(90vh,48rem)]! w-full! overflow-hidden p-0">
              <Modal.Heading className="sr-only">
                Pick your location on the map
              </Modal.Heading>
              {draftPin ? (
                <>
                  <LocationPinMap
                    key={`location-pin-${mapSessionKey}`}
                    className="absolute inset-0 h-full w-full"
                    pin={draftPin}
                    onInvalidPin={() => {
                      setPickerError(
                        "Pick a point inside Kenya (−5 to 5.5 lat, 33.5 to 42 lng).",
                      );
                    }}
                    onPinChange={(next) => {
                      setDraftPin(next);
                      setPickerError(null);
                    }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-4 z-1000 flex justify-center px-4 sm:top-5">
                    <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl bg-white/92 shadow-[0_12px_40px_rgba(20,46,38,0.22)] ring-1 ring-black/8 backdrop-blur-md dark:bg-stone-950/90 dark:ring-white/10">
                      <div className="h-1 w-full bg-linear-to-r from-[#142e26] via-[#0f766e] to-[#b45309]" />
                      <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#142e26]/10 text-[#142e26] dark:bg-teal-400/15 dark:text-teal-300">
                            <MapPin className="h-4 w-4" strokeWidth={1.75} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">
                              Selected point
                            </p>
                            <p className="mt-0.5 truncate text-sm font-semibold text-foreground tabular-nums">
                              {formatCoord(draftPin.lat)},{" "}
                              {formatCoord(draftPin.lng)}
                            </p>
                            {pickerError ? (
                              <p className="mt-1 text-xs text-danger">
                                {pickerError}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-muted">
                                Tap the map to move the pin, then save.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="h-9 flex-1 rounded-full"
                            size="sm"
                            type="button"
                            variant="secondary"
                            onPress={() => mapModalState.close()}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="h-9 flex-1 rounded-full bg-accent text-accent-foreground"
                            size="sm"
                            type="button"
                            variant="primary"
                            onPress={handleSave}
                          >
                            Save location
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
