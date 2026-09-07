import type { LatLng } from "./types";

/**
 * Fetches a road-following path through the given waypoints from the
 * server-side Geoapify routing proxy. Returns an empty array when routing
 * is unavailable so callers can fall back to straight lines.
 */
export async function fetchRoadPath(waypoints: LatLng[]): Promise<LatLng[]> {
  if (waypoints.length < 2) return [];
  const query = waypoints
    .slice(0, 25)
    .map((point) => `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`)
    .join("|");

  try {
    const response = await fetch(`/api/public/route-path?waypoints=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    const data = (await response.json()) as { ok?: boolean; path?: LatLng[] };
    return data.ok && Array.isArray(data.path) ? data.path : [];
  } catch {
    return [];
  }
}

/** Cache key for a set of waypoints. */
export function pathKey(waypoints: LatLng[]): string {
  return waypoints.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
}
