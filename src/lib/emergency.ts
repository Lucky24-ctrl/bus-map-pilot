import type { AmbulancePosition } from "./ambulances";
import { distanceKm } from "./nearby";
import type { LatLng } from "./types";

export type EmergencyKind = "medical" | "accident" | "fire" | "other";

export type EmergencyRequest = {
  id: string;
  kind: EmergencyKind;
  note: string;
  contact: string;
  at: LatLng;
  placeName: string;
  createdAt: number;
};

export type Dispatch = {
  ambulance: AmbulancePosition;
  km: number;
  etaMinutes: number;
};

export const EMERGENCY_KINDS: { value: EmergencyKind; label: string }[] = [
  { value: "medical", label: "Medical emergency" },
  { value: "accident", label: "Road accident" },
  { value: "fire", label: "Fire / smoke" },
  { value: "other", label: "Other" },
];

/** Nearest ambulance to the incident, with a road-adjusted ETA. */
export function dispatchNearest(
  ambulances: AmbulancePosition[],
  at: LatLng,
): Dispatch | null {
  let best: Dispatch | null = null;
  for (const ambulance of ambulances) {
    const km = distanceKm(at, { lat: ambulance.lat, lng: ambulance.lng });
    if (best && km >= best.km) continue;
    // Straight-line distance underestimates city driving; pad it by 30%.
    const etaMinutes = Math.max(1, Math.round(((km * 1.3) / ambulance.speedKmh) * 60));
    best = { ambulance, km, etaMinutes };
  }
  return best;
}
