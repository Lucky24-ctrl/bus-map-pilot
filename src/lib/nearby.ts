import type { LatLng, Stop, TrackedBus } from "./types";

const EARTH_RADIUS_KM = 6371;

export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function toMiles(km: number): number {
  return km * 0.621371;
}

export type NearbyStop = {
  key: string;
  stop: Stop;
  routeId: string;
  routeName: string;
  km: number;
};

/** Stops of every known route, closest first relative to `origin`. */
export function nearbyStops(fleet: TrackedBus[], origin: LatLng, limit = 8): NearbyStop[] {
  const seen = new Set<string>();
  const entries: NearbyStop[] = [];

  for (const tracked of fleet) {
    const route = tracked.route;
    if (!route) continue;
    for (const stop of route.stops) {
      const key = `${route.id}:${stop.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        key,
        stop,
        routeId: route.id,
        routeName: route.name,
        km: distanceKm(origin, { lat: stop.lat, lng: stop.lng }),
      });
    }
  }

  return entries.sort((a, b) => a.km - b.km).slice(0, limit);
}

export type RouteOption = {
  key: string;
  routeId: string;
  routeName: string;
  stopName: string;
  stop: Stop;
  miles: number;
  departure: Date;
  busId: string | null;
  busNumber: string | null;
};

/**
 * Route options serving the stops closest to a selected place, with an
 * estimated next departure derived from the stop distance.
 */
export function routeOptionsFor(
  fleet: TrackedBus[],
  origin: LatLng,
  limit = 5,
): RouteOption[] {
  const stops = nearbyStops(fleet, origin, limit * 3);
  const byRoute = new Map<string, NearbyStop>();
  for (const entry of stops) {
    if (!byRoute.has(entry.routeId)) byRoute.set(entry.routeId, entry);
  }

  const now = Date.now();
  return [...byRoute.values()]
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
    .map((entry, index) => {
      const bus = fleet.find((tracked) => tracked.route?.id === entry.routeId) ?? null;
      const minutes = Math.round(entry.km * 3) + 4 + index * 6;
      return {
        key: entry.key,
        routeId: entry.routeId,
        routeName: entry.routeName,
        stopName: entry.stop.name,
        stop: entry.stop,
        miles: toMiles(entry.km),
        departure: new Date(now + minutes * 60_000),
        busId: bus?.bus.id ?? null,
        busNumber: bus?.bus.bus_number ?? null,
      };
    });
}

export function formatClock(date: Date): string {
  return date
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s?AM$/i, " a.m")
    .replace(/\s?PM$/i, " p.m");
}
