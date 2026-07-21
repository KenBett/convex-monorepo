"use client";

import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { getCropTheme } from "@repo/types";

import "leaflet/dist/leaflet.css";

export type LatLng = { lat: number; lng: number };

export type DeliveryRouteMapProps = {
  className?: string;
  crop?: string;
  /** Formatted needed-by date for the delivery marker card. */
  dateLabel?: string | null;
  dropoff: LatLng;
  dropoffLabel: string;
  imageUrl?: string | null;
  pickup: LatLng;
  pickupLabel: string;
  quantityKg?: number | null;
  /** Formatted needed-by time for the delivery marker card. */
  timeLabel?: string | null;
  /** Compact card thumb vs full interactive map. */
  variant?: "preview" | "expanded";
};

const SAME_POINT_EPS = 0.00005;
/** Full pickup → dropoff loop duration (ms). */
const TRUCK_LOOP_MS = 10_000;
/** Dash pattern length used for the marching black/white shimmer. */
const ROUTE_DASH_PATTERN = "14 18";
const ROUTE_DASH_CYCLE = 32;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline Lucide-style icons for Leaflet DivIcon HTML (no React tree). */
const ICON_CALENDAR = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`;
const ICON_CLOCK = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const ICON_PACKAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/></svg>`;

function isSamePoint(a: LatLng, b: LatLng): boolean {
  return (
    Math.abs(a.lat - b.lat) < SAME_POINT_EPS &&
    Math.abs(a.lng - b.lng) < SAME_POINT_EPS
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function makePickupCardIcon(input: {
  cropLabel: string;
  imageUrl?: string | null;
  name: string;
  quantityKg?: number | null;
}): L.DivIcon {
  const name = escapeHtml(input.name);
  const cropLabel = escapeHtml(input.cropLabel);
  const quantityLabel =
    input.quantityKg != null && Number.isFinite(input.quantityKg)
      ? `${escapeHtml(String(input.quantityKg))} kg`
      : null;
  const imageHtml = input.imageUrl
    ? `<img src="${escapeHtml(input.imageUrl)}" alt="" width="40" height="40" style="display:block;width:40px;height:40px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#e7e5e4" />`
    : `<span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:8px;flex-shrink:0;background:#f5f5f4;font:700 11px/1 system-ui,sans-serif;color:#57534e">${cropLabel.slice(0, 1)}</span>`;
  const metaParts = [cropLabel, quantityLabel].filter(Boolean);
  const metaHtml = metaParts
    .map(
      (part) =>
        `<span style="font:600 11px/1.25 system-ui,sans-serif;color:#57534e">${part}</span>`,
    )
    .join(
      `<span style="font:600 11px/1.25 system-ui,sans-serif;color:#a8a29e"> · </span>`,
    );

  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;transform:translate(-50%,calc(-100% + 7px));width:max-content">
        <div style="display:flex;align-items:center;gap:8px;padding:6px 8px 6px 6px;border-radius:12px;background:rgba(255,255,255,.97);box-shadow:0 2px 10px rgba(0,0,0,.22);border:1px solid rgba(0,0,0,.08);width:max-content;max-width:min(280px,70vw)">
          ${imageHtml}
          <div style="min-width:0">
            <div style="font:700 12px/1.3 system-ui,sans-serif;color:#1c1917;white-space:normal;overflow-wrap:anywhere">${name}</div>
            <div style="margin-top:2px;display:flex;flex-wrap:wrap;align-items:center;gap:0">${metaHtml}</div>
          </div>
        </div>
        <span style="display:block;width:14px;height:14px;flex-shrink:0;border-radius:9999px;background:#142e26;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>
      </div>
    `,
    iconAnchor: [0, 0],
    iconSize: [0, 0],
  });
}

function makeLabeledIcon(input: {
  accent: string;
  dateLabel?: string | null;
  place: string;
  quantityKg?: number | null;
  role: string;
  timeLabel?: string | null;
}): L.DivIcon {
  const role = escapeHtml(input.role);
  const place = escapeHtml(input.place);
  const dateLabel = input.dateLabel?.trim()
    ? escapeHtml(input.dateLabel.trim())
    : null;
  const timeLabel = input.timeLabel?.trim()
    ? escapeHtml(input.timeLabel.trim())
    : null;
  const quantityLabel =
    input.quantityKg != null && Number.isFinite(input.quantityKg)
      ? `${escapeHtml(String(input.quantityKg))} kg`
      : null;

  const detailRows: string[] = [];

  if (dateLabel) {
    detailRows.push(`
      <div style="display:flex;align-items:center;gap:5px;min-width:0">
        <span style="display:inline-flex;flex-shrink:0;color:${input.accent}" aria-hidden="true">${ICON_CALENDAR}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${dateLabel}</span>
      </div>`);
  }
  if (timeLabel) {
    detailRows.push(`
      <div style="display:flex;align-items:center;gap:5px;min-width:0">
        <span style="display:inline-flex;flex-shrink:0;color:${input.accent}" aria-hidden="true">${ICON_CLOCK}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${timeLabel}</span>
      </div>`);
  }
  if (quantityLabel) {
    detailRows.push(`
      <div style="display:flex;align-items:center;gap:5px;min-width:0">
        <span style="display:inline-flex;flex-shrink:0;color:${input.accent}" aria-hidden="true">${ICON_PACKAGE}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${quantityLabel}</span>
      </div>`);
  }

  const detailsHtml =
    detailRows.length > 0
      ? `<div style="margin-top:6px;display:flex;flex-direction:column;gap:3px;font:600 10px/1.25 system-ui,sans-serif;color:#44403c;text-align:left">${detailRows.join("")}</div>`
      : "";

  // Anchor at latlng: circle center sits on the point; label floats above.
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;transform:translate(-50%,calc(-100% + 7px));width:max-content">
        <div style="padding:7px 10px;border-radius:10px;background:rgba(255,255,255,.97);box-shadow:0 2px 10px rgba(0,0,0,.22);border:1px solid rgba(0,0,0,.08);text-align:center;max-width:220px">
          <div style="font:800 12px/1.1 system-ui,sans-serif;letter-spacing:.02em;color:${input.accent}">${role}</div>
          <div style="margin-top:3px;font:600 11px/1.25 system-ui,sans-serif;color:#1c1917;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${place}</div>
          ${detailsHtml}
        </div>
        <span style="display:block;width:14px;height:14px;flex-shrink:0;border-radius:9999px;background:${input.accent};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>
      </div>
    `,
    iconAnchor: [0, 0],
    iconSize: [0, 0],
  });
}

function makeCompactIcon(accent: string, badge: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${accent};color:#fff;font:700 11px/1 system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.35)">${badge}</span>`,
    iconAnchor: [11, 11],
    iconSize: [22, 22],
  });
}

function makeTruckIcon(size: number): L.DivIcon {
  // Lucide "truck" — always upright so it stays readable while moving.
  const truckSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" stroke="#000" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 18H9" stroke="#000" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" stroke="#000" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="17" cy="18" r="2" stroke="#000" stroke-width="2.25"/>
      <circle cx="7" cy="18" r="2" stroke="#000" stroke-width="2.25"/>
    </svg>
  `;

  return L.divIcon({
    className: "",
    html: `
      <div style="transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;width:${size + 10}px;height:${size + 10}px;border-radius:9999px;background:rgba(255,255,255,.94);border:1.5px solid #000;box-shadow:0 2px 8px rgba(0,0,0,.28)">
        ${truckSvg}
      </div>
    `,
    iconAnchor: [0, 0],
    iconSize: [0, 0],
  });
}

type RouteSample = {
  lat: number;
  lng: number;
};

function buildRouteMetrics(route: [number, number][]): {
  cumulative: number[];
  total: number;
} {
  const cumulative = [0];
  let total = 0;

  for (let index = 1; index < route.length; index += 1) {
    const prev = L.latLng(route[index - 1]![0], route[index - 1]![1]);
    const next = L.latLng(route[index]![0], route[index]![1]);

    total += prev.distanceTo(next);
    cumulative.push(total);
  }

  return { cumulative, total };
}

function sampleRouteAtProgress(
  route: [number, number][],
  progress: number,
  metrics?: { cumulative: number[]; total: number },
): RouteSample {
  const first = route[0]!;

  if (route.length < 2) {
    return { lat: first[0], lng: first[1] };
  }

  const { cumulative, total } = metrics ?? buildRouteMetrics(route);

  if (total <= 0) {
    return { lat: first[0], lng: first[1] };
  }

  const target = Math.min(1, Math.max(0, progress)) * total;
  let segment = 1;

  while (segment < cumulative.length && cumulative[segment]! < target) {
    segment += 1;
  }

  const startIndex = Math.max(0, segment - 1);
  const endIndex = Math.min(route.length - 1, segment);
  const start = route[startIndex]!;
  const end = route[endIndex]!;
  const startDist = cumulative[startIndex]!;
  const endDist = cumulative[endIndex]!;
  const span = Math.max(endDist - startDist, 1e-6);
  const t = (target - startDist) / span;

  return {
    lat: start[0] + (end[0] - start[0]) * t,
    lng: start[1] + (end[1] - start[1]) * t,
  };
}

/**
 * Black base line + white marching dashes, with a truck that loops
 * pickup → dropoff along the road geometry.
 */
function AnimatedRouteLayer({
  route,
  weight,
  truckSize,
}: {
  route: [number, number][];
  truckSize: number;
  weight: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (route.length < 2) {
      return;
    }

    const reduceMotion = prefersReducedMotion();
    const metrics = buildRouteMetrics(route);
    const base = L.polyline(route, {
      color: "#000000",
      interactive: false,
      opacity: 1,
      weight,
    }).addTo(map);

    const shimmer = L.polyline(route, {
      color: "#ffffff",
      dashArray: ROUTE_DASH_PATTERN,
      dashOffset: "0",
      interactive: false,
      lineCap: "butt",
      opacity: 0.95,
      weight: Math.max(2, weight - 1),
    }).addTo(map);

    const startSample = sampleRouteAtProgress(route, 0, metrics);
    const truckIcon = makeTruckIcon(truckSize);
    const truck = L.marker([startSample.lat, startSample.lng], {
      icon: truckIcon,
      interactive: false,
      keyboard: false,
      zIndexOffset: 800,
    }).addTo(map);

    if (reduceMotion) {
      return () => {
        map.removeLayer(base);
        map.removeLayer(shimmer);
        map.removeLayer(truck);
      };
    }

    let frame = 0;
    let dashOffset = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      dashOffset = (dashOffset + 0.55) % ROUTE_DASH_CYCLE;
      shimmer.setStyle({ dashOffset: String(-dashOffset) });

      const loopProgress = ((now - startedAt) % TRUCK_LOOP_MS) / TRUCK_LOOP_MS;
      const sample = sampleRouteAtProgress(route, loopProgress, metrics);

      truck.setLatLng([sample.lat, sample.lng]);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      map.removeLayer(base);
      map.removeLayer(shimmer);
      map.removeLayer(truck);
    };
  }, [map, route, truckSize, weight]);

  return null;
}

/**
 * Keep the full path framed and centered at a comfortable zoom for any
 * distance. Re-fits after layout changes (modal open, thumbnail size).
 */
function FitRouteInView({
  pickup,
  dropoff,
  route,
  padding,
  maxZoom,
}: {
  dropoff: LatLng;
  maxZoom: number;
  padding: number;
  pickup: LatLng;
  route: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    let frame = 0;

    const fit = () => {
      map.invalidateSize({ pan: false });

      const points: [number, number][] =
        route && route.length > 1
          ? route
          : [
              [pickup.lat, pickup.lng],
              [dropoff.lat, dropoff.lng],
            ];

      if (isSamePoint(pickup, dropoff) && !(route && route.length > 1)) {
        map.setView([pickup.lat, pickup.lng], Math.min(maxZoom, 15), {
          animate: false,
        });

        return;
      }

      const bounds = L.latLngBounds(points);

      if (!bounds.isValid()) {
        return;
      }

      map.fitBounds(bounds, {
        animate: false,
        // Extra top room for popup-style pickup/delivery labels.
        paddingTopLeft: [padding, padding + 56],
        paddingBottomRight: [padding, padding],
        maxZoom,
      });
    };

    const scheduleFit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    fit();
    // Modal / flex layout often settles after first paint.
    const t1 = window.setTimeout(fit, 50);
    const t2 = window.setTimeout(fit, 280);

    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      scheduleFit();
    });

    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      observer.disconnect();
    };
  }, [
    map,
    pickup.lat,
    pickup.lng,
    dropoff.lat,
    dropoff.lng,
    route,
    padding,
    maxZoom,
  ]);

  return null;
}

async function fetchOsrmRoute(
  pickup: LatLng,
  dropoff: LatLng,
): Promise<[number, number][] | null> {
  if (isSamePoint(pickup, dropoff)) {
    return null;
  }

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}` +
    `?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      code?: string;
      routes?: Array<{
        geometry?: { coordinates?: [number, number][] };
      }>;
    };

    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates) {
      return null;
    }
    // OSRM snaps to the road network — bookend with exact marker coords
    // so the path visibly touches pickup and delivery points.
    const road = data.routes[0].geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );

    return [[pickup.lat, pickup.lng], ...road, [dropoff.lat, dropoff.lng]];
  } catch {
    return null;
  }
}

export function DeliveryRouteMap({
  className,
  crop,
  dateLabel,
  pickup,
  dropoff,
  pickupLabel,
  dropoffLabel,
  imageUrl,
  quantityKg,
  timeLabel,
  variant = "preview",
}: DeliveryRouteMapProps) {
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeFailed, setRouteFailed] = useState(false);
  const isExpanded = variant === "expanded";
  const samePoint = useMemo(
    () => isSamePoint(pickup, dropoff),
    [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng],
  );
  const cropLabel = crop ? getCropTheme(crop).label : "Crop";

  useEffect(() => {
    let cancelled = false;

    setRoute(null);
    setRouteFailed(false);

    if (samePoint) {
      setRouteFailed(true);

      return;
    }

    void fetchOsrmRoute(pickup, dropoff).then((coords) => {
      if (cancelled) {
        return;
      }
      if (coords && coords.length > 1) {
        setRoute(coords);
      } else {
        setRouteFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, samePoint]);

  const center: [number, number] = [
    (pickup.lat + dropoff.lat) / 2,
    (pickup.lng + dropoff.lng) / 2,
  ];

  const pickupIcon = isExpanded
    ? makePickupCardIcon({
        cropLabel,
        imageUrl,
        name: pickupLabel,
        quantityKg,
      })
    : makeCompactIcon("#142e26", "A");

  const dropoffIcon = isExpanded
    ? makeLabeledIcon({
        accent: "#b45309",
        dateLabel,
        place: dropoffLabel,
        quantityKg,
        role: "Delivery",
        timeLabel,
      })
    : makeCompactIcon("#b45309", "B");

  return (
    <div
      className={
        className ??
        (isExpanded
          ? "relative h-full w-full overflow-hidden"
          : "relative h-full w-full overflow-hidden rounded-md")
      }
    >
      <MapContainer
        attributionControl={isExpanded}
        center={center}
        className="h-full w-full [&_.leaflet-control-attribution]:text-[10px]"
        doubleClickZoom={isExpanded}
        dragging={isExpanded}
        scrollWheelZoom={isExpanded}
        zoom={10}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          icon={pickupIcon}
          position={[pickup.lat, pickup.lng]}
          title={`Pickup: ${pickupLabel}`}
          zIndexOffset={600}
        />
        <Marker
          icon={dropoffIcon}
          position={[dropoff.lat, dropoff.lng]}
          title={`Delivery: ${dropoffLabel}`}
          zIndexOffset={500}
        />
        {route ? (
          <AnimatedRouteLayer
            route={route}
            truckSize={isExpanded ? 18 : 14}
            weight={isExpanded ? 6 : 3}
          />
        ) : null}
        <FitRouteInView
          dropoff={dropoff}
          maxZoom={isExpanded ? 16 : 15}
          padding={isExpanded ? 96 : 20}
          pickup={pickup}
          route={route}
        />
      </MapContainer>
      {routeFailed ? (
        <p
          className={
            isExpanded
              ? "pointer-events-none absolute bottom-4 left-1/2 z-500 max-w-[90%] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-xs font-medium text-white"
              : "pointer-events-none absolute bottom-1 left-1 right-1 rounded bg-black/55 px-1.5 py-0.5 text-center text-[9px] font-medium text-white"
          }
        >
          {samePoint
            ? "Pickup and delivery share the same coordinates — update profile locations to see a road route"
            : "Route unavailable"}
        </p>
      ) : null}
    </div>
  );
}
