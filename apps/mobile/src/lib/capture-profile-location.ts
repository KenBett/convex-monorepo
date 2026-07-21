import { resolveProfileLocation, type ResolvedLocation } from "@repo/types";
import * as Location from "expo-location";

/** Prefer device GPS; fall back to county centroid for onboarding profiles. */
export async function captureProfileLocation(
  county: string,
): Promise<ResolvedLocation> {
  let geoLat: number | null = null;
  let geoLng: number | null = null;

  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status === "granted") {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      geoLat = position.coords.latitude;
      geoLng = position.coords.longitude;
    }
  } catch {
    // Fall through to county centroid.
  }

  return resolveProfileLocation({
    county,
    geoLat,
    geoLng,
  });
}
