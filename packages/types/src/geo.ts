import type { County } from "./marketplace";
import { COUNTIES } from "./marketplace";

/** Approximate county seat / market centroids for Kenya (WGS84). */
export const COUNTY_CENTROIDS: Record<
  County,
  { lat: number; lng: number }
> = {
  Nairobi: { lat: -1.286389, lng: 36.817223 },
  Kiambu: { lat: -1.1714, lng: 36.8356 },
  Nakuru: { lat: -0.3031, lng: 36.08 },
  "Uasin Gishu": { lat: 0.5143, lng: 35.2698 },
  Meru: { lat: 0.0463, lng: 37.6559 },
  Nyeri: { lat: -0.4197, lng: 36.9476 },
  Kisumu: { lat: -0.0917, lng: 34.768 },
  Machakos: { lat: -1.5177, lng: 37.2634 },
  Bungoma: { lat: 0.5635, lng: 34.5606 },
  Kakamega: { lat: 0.2827, lng: 34.7519 },
};

/** Rough Kenya bounding box for sanity checks. */
export const KENYA_BOUNDS = {
  minLat: -5.0,
  maxLat: 5.5,
  minLng: 33.5,
  maxLng: 42.0,
} as const;

export function getCountyCentroid(county: string): {
  lat: number;
  lng: number;
} {
  if ((COUNTIES as readonly string[]).includes(county)) {
    return COUNTY_CENTROIDS[county as County];
  }

  return COUNTY_CENTROIDS.Nairobi;
}

export function isValidKenyaLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= KENYA_BOUNDS.minLat &&
    lat <= KENYA_BOUNDS.maxLat &&
    lng >= KENYA_BOUNDS.minLng &&
    lng <= KENYA_BOUNDS.maxLng
  );
}

export type ResolvedLocation = {
  locationCapturedAt: number;
  locationLabel?: string;
  locationLat: number;
  locationLng: number;
  /** `gps` when device coords were used; `county` when falling back to centroid. */
  source: "gps" | "county";
};

/**
 * Prefer browser/device geolocation when in Kenya; otherwise fall back to county centroid.
 */
export function resolveProfileLocation(input: {
  county: string;
  geoLat?: number | null;
  geoLng?: number | null;
  label?: string;
}): ResolvedLocation {
  const now = Date.now();
  if (
    input.geoLat != null &&
    input.geoLng != null &&
    isValidKenyaLatLng(input.geoLat, input.geoLng)
  ) {
    return {
      locationCapturedAt: now,
      locationLabel: input.label,
      locationLat: input.geoLat,
      locationLng: input.geoLng,
      source: "gps",
    };
  }

  const centroid = getCountyCentroid(input.county);
  return {
    locationCapturedAt: now,
    locationLabel: input.label ?? `${input.county} county center`,
    locationLat: centroid.lat,
    locationLng: centroid.lng,
    source: "county",
  };
}
