import { buildLoop, loopLengthKm, pointAt } from "./simulation";
import type { LatLng } from "./types";

export type AmbulanceUnit = {
  id: string;
  code: string;
  hospital: string;
  /** Waypoints of the patrol/dispatch corridor, snapped to roads at runtime. */
  waypoints: LatLng[];
  /** Cruising speed in km/h. */
  speedKmh: number;
};

/** Two demo ambulances tracked live alongside the bus fleet. */
export const AMBULANCES: AmbulanceUnit[] = [
  {
    id: "amb-01",
    code: "AMB-01",
    hospital: "Jayadeva Hospital, Bannerghatta Rd",
    // Central city → Jayadeva Hospital and back, in continuous rounds.
    waypoints: [
      { lat: 12.9767, lng: 77.5946 }, // central city depot
      { lat: 12.9400, lng: 77.5950 }, // south along Bannerghatta Rd
      { lat: 12.9166, lng: 77.5996 }, // Jayadeva Hospital
      { lat: 12.9400, lng: 77.5950 }, // return leg
    ],
    speedKmh: 48,
  },
  {
    id: "amb-02",
    code: "AMB-02",
    hospital: "Manipal Hospital, Kanakpura Rd",
    // Central city → Manipal Hospital on Kanakpura Rd and back, in rounds.
    waypoints: [
      { lat: 12.9767, lng: 77.5946 }, // central city depot
      { lat: 12.9350, lng: 77.5760 }, // south-west towards Kanakpura Rd
      { lat: 12.8847, lng: 77.5835 }, // Manipal Hospital, Kanakpura Rd
      { lat: 12.9350, lng: 77.5760 }, // return leg
    ],
    speedKmh: 52,
  },
];

export type AmbulancePosition = {
  id: string;
  code: string;
  hospital: string;
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
};

/** Live position of an ambulance along its road-snapped corridor. */
export function ambulancePosition(
  unit: AmbulanceUnit,
  path: LatLng[],
  now: number,
): AmbulancePosition | null {
  const points = path.length > 1 ? path : unit.waypoints;
  const loop = buildLoop(points);
  const total = loopLengthKm(loop);
  if (total <= 0) return null;

  const travelled = (now / 3_600_000) * unit.speedKmh;
  const at = pointAt(loop, travelled);
  if (!at) return null;

  return {
    id: unit.id,
    code: unit.code,
    hospital: unit.hospital,
    lat: at.at.lat,
    lng: at.at.lng,
    heading: at.heading,
    speedKmh: unit.speedKmh,
  };
}
