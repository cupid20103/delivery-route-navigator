import { LngLat } from "@/types/screen";
import { MAPBOX_PUBLIC_TOKEN } from "./constant";

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const haversineMeters = (a: LngLat, b: LngLat) => {
  const EARTH_RADIUS_M = 6_371_000;

  const dLat = degreesToRadians(b[1] - a[1]);
  const dLng = degreesToRadians(b[0] - a[0]);
  const lat1 = degreesToRadians(a[1]);
  const lat2 = degreesToRadians(b[1]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

export const formatDistance = (meters?: number) => {
  if (meters == null) return "";

  const miles = meters / 1609.34;

  return `${miles.toFixed(1)} mi`;
};

export const formatDuration = (seconds?: number) => {
  if (!seconds) return "";

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;

  return `${hours} h ${remMins} min`;
};

export const fetchRouteLeg = async (
  from: LngLat,
  to: LngLat,
  options: { overview?: "false" | "full" } = { overview: "false" }
): Promise<{
  distance?: number;
  duration?: number;
  geometry?: GeoJSON.LineString;
}> => {
  try {
    if (!MAPBOX_PUBLIC_TOKEN) {
      console.warn("Missing MAPBOX_PUBLIC_TOKEN; fetchRouteLeg skipped.");

      return {};
    }

    const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
    const params = new URLSearchParams({
      access_token: MAPBOX_PUBLIC_TOKEN,
      geometries: "geojson",
      overview: options.overview ?? "false",
    });

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?${params.toString()}`;

    const response = await fetch(url);
    const json = await response.json();

    const firstRoute = json?.routes?.[0];

    if (!firstRoute) return {};

    return {
      distance: firstRoute.distance,
      duration: firstRoute.duration,
      geometry: firstRoute.geometry,
    };
  } catch (error) {
    console.error("fetchRouteLeg error:", error);

    return {};
  }
};
