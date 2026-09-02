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
    hospital: "City General Hospital",
    waypoints: [
      { lat: 12.9767, lng: 77.5946 },
      { lat: 12.9698, lng: 77.6205 },
      { lat: 12.9542, lng: 77.6100 },
      { lat: 12.9611, lng: 77.5800 },
    ],
    speedKmh: 48,
  },
  {
    id: "amb-02",
    code: "AMB-02",
    hospital: "Northside Trauma Centre",
    waypoints: [
      { lat: 12.9910, lng: 77.5710 },
      { lat: 13.0068, lng: 77.5920 },
      { lat: 12.9950, lng: 77.6150 },
      { lat: 12.9800, lng: 77.5850 },
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
