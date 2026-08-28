import { distanceKm } from "./nearby";
import type { LatLng, LiveLocation, Stop, TrackedBus } from "./types";

/** Average simulated cruising speed, km/h. */
export const SIM_SPEED_KMH = 26;

type PathPoint = LatLng & { cumulativeKm: number };

/**
 * Builds a closed loop through every stop of a route (last stop back to the
 * first) with cumulative distances, so a bus can be animated around it.
 */
export function buildLoop(stops: Stop[]): PathPoint[] {
  if (stops.length < 2) return [];
  const ordered = [...stops, stops[0]!];
  const points: PathPoint[] = [];
  let total = 0;
  ordered.forEach((stop, index) => {
    if (index > 0) {
      const previous = ordered[index - 1]!;
      total += distanceKm({ lat: previous.lat, lng: previous.lng }, { lat: stop.lat, lng: stop.lng });
    }
    points.push({ lat: stop.lat, lng: stop.lng, cumulativeKm: total });
  });
  return points;
}

export function loopLengthKm(loop: PathPoint[]): number {
  return loop.length > 0 ? loop[loop.length - 1]!.cumulativeKm : 0;
}

function bearing(from: LatLng, to: LatLng): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** Position (and heading) at a given travelled distance along the loop. */
export function pointAt(
  loop: PathPoint[],
  travelledKm: number,
): { at: LatLng; heading: number; segmentEndIndex: number } | null {
  const total = loopLengthKm(loop);
  if (loop.length < 2 || total <= 0) return null;
  const distance = ((travelledKm % total) + total) % total;

  for (let i = 1; i < loop.length; i += 1) {
    const previous = loop[i - 1]!;
    const current = loop[i]!;
    if (distance <= current.cumulativeKm || i === loop.length - 1) {
      const span = current.cumulativeKm - previous.cumulativeKm || 1;
      const ratio = Math.min(1, Math.max(0, (distance - previous.cumulativeKm) / span));
      const at = {
        lat: previous.lat + (current.lat - previous.lat) * ratio,
        lng: previous.lng + (current.lng - previous.lng) * ratio,
      };
      return { at, heading: bearing(previous, current), segmentEndIndex: i };
    }
  }
  return null;
}

/** Stable 0..1 offset so buses on the same route are spread around the loop. */
function offsetFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  return hash / 100000;
}

/**
 * Test simulation: animates a bus around the stops of its route so the map
 * shows realistic movement whenever no real driver device is reporting.
 */
export function simulateLocation(tracked: TrackedBus, now: number): LiveLocation | null {
  const stops = tracked.route?.stops ?? [];
  const loop = buildLoop(stops);
  const total = loopLengthKm(loop);
  if (total <= 0) return null;

  const travelled = (now / 3_600_000) * SIM_SPEED_KMH + offsetFor(tracked.bus.id) * total;
  const point = pointAt(loop, travelled);
  if (!point) return null;

  return {
    id: `sim-${tracked.bus.id}`,
    bus_id: tracked.bus.id,
    latitude: point.at.lat,
    longitude: point.at.lng,
    speed: SIM_SPEED_KMH,
    heading: point.heading,
    accuracy: 12,
    updated_at: new Date(now).toISOString(),
  };
}

export type NextStopEta = {
  stopName: string;
  km: number;
  minutes: number;
  arrival: Date;
};

/** Estimated arrival at the next stop ahead of the bus on its route loop. */
export function nextStopEta(tracked: TrackedBus, now = Date.now()): NextStopEta | null {
  const stops = tracked.route?.stops ?? [];
  const location = tracked.location;
  if (!location || stops.length === 0) return null;

  const here = { lat: location.latitude, lng: location.longitude };
  const loop = buildLoop(stops);
  if (loop.length < 2) {
    const only = stops[0]!;
    const km = distanceKm(here, { lat: only.lat, lng: only.lng });
    const minutes = Math.max(1, Math.round((km / SIM_SPEED_KMH) * 60));
    return { stopName: only.name, km, minutes, arrival: new Date(now + minutes * 60_000) };
  }

  // Find the nearest point on the loop, then take the stop closing that segment.
  let best: { index: number; km: number } | null = null;
  loop.forEach((point, index) => {
    const km = distanceKm(here, point);
    if (!best || km < best.km) best = { index, km };
  });
  if (!best) return null;

  const chosen = best as { index: number; km: number };
  const aheadIndex = (chosen.index + 1) % stops.length;
  const target = stops[aheadIndex] ?? stops[0]!;
  const km = distanceKm(here, { lat: target.lat, lng: target.lng });
  const speed = location.speed && location.speed > 3 ? location.speed : SIM_SPEED_KMH;
  const minutes = Math.max(1, Math.round((km / speed) * 60));
  return { stopName: target.name, km, minutes, arrival: new Date(now + minutes * 60_000) };
}
