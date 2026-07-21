import { resolveProfileLocation, type ResolvedLocation } from "@repo/types";

function readBrowserPosition(): Promise<GeolocationPosition | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    );
  });
}

/** Prefer device GPS; fall back to county centroid for onboarding profiles. */
export async function captureProfileLocation(
  county: string,
): Promise<ResolvedLocation> {
  const position = await readBrowserPosition();

  return resolveProfileLocation({
    county,
    geoLat: position?.coords.latitude ?? null,
    geoLng: position?.coords.longitude ?? null,
  });
}
