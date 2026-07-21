import { getCountyCentroid } from "@repo/types";

/** Prefer profile GPS; fall back to county centroid for routing. */
export function resolveDriveCoords(input: {
  county: string;
  locationLat?: number;
  locationLng?: number;
}): { lat: number; lng: number } {
  if (
    input.locationLat != null &&
    input.locationLng != null &&
    Number.isFinite(input.locationLat) &&
    Number.isFinite(input.locationLng)
  ) {
    return { lat: input.locationLat, lng: input.locationLng };
  }
  return getCountyCentroid(input.county);
}
