"use client";

import { isValidKenyaLatLng } from "@repo/types";
import L from "leaflet";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

export type LocationPin = { lat: number; lng: number };

type LocationPinMapProps = {
  className?: string;
  pin: LocationPin;
  onPinChange: (pin: LocationPin) => void;
  onInvalidPin?: () => void;
};

function makePinIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;transform:translateY(-100%)">
        <div style="padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.97);box-shadow:0 2px 10px rgba(0,0,0,.22);border:1px solid rgba(0,0,0,.08);text-align:center;max-width:200px">
          <div style="font:800 12px/1.1 system-ui,sans-serif;letter-spacing:.02em;color:#142e26">Your location</div>
          <div style="margin-top:3px;font:600 11px/1.25 system-ui,sans-serif;color:#57534e">Tap map to move pin</div>
        </div>
        <span style="width:14px;height:14px;border-radius:9999px;background:#142e26;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>
      </div>
    `,
    iconAnchor: [7, 14],
    iconSize: [14, 14],
  });
}

function MapClickHandler({
  onPinChange,
  onInvalidPin,
}: {
  onInvalidPin?: () => void;
  onPinChange: (pin: LocationPin) => void;
}) {
  useMapEvents({
    click(event) {
      const next = { lat: event.latlng.lat, lng: event.latlng.lng };

      if (!isValidKenyaLatLng(next.lat, next.lng)) {
        onInvalidPin?.();

        return;
      }
      onPinChange(next);
    },
  });

  return null;
}

function KeepMapSized() {
  const map = useMap();

  useEffect(() => {
    let frame = 0;

    const sync = () => {
      map.invalidateSize({ pan: false });
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };

    sync();
    const t1 = window.setTimeout(sync, 50);
    const t2 = window.setTimeout(sync, 280);

    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      schedule();
    });

    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

export function LocationPinMap({
  className,
  pin,
  onPinChange,
  onInvalidPin,
}: LocationPinMapProps) {
  const pinIcon = makePinIcon();

  return (
    <div className={className ?? "relative h-full w-full overflow-hidden"}>
      <MapContainer
        attributionControl
        doubleClickZoom
        dragging
        scrollWheelZoom
        center={[pin.lat, pin.lng]}
        className="h-full w-full cursor-crosshair [&_.leaflet-control-attribution]:text-[10px]"
        zoom={12}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          icon={pinIcon}
          position={[pin.lat, pin.lng]}
          title="Selected location"
          zIndexOffset={600}
        />
        <MapClickHandler
          onInvalidPin={onInvalidPin}
          onPinChange={onPinChange}
        />
        <KeepMapSized />
      </MapContainer>
    </div>
  );
}
