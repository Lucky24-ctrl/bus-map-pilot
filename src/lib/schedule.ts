import type { TrackedBus } from "./types";

export type Punctuality = {
  /** Signed minutes off schedule: negative = early, positive = late. */
  minutes: number;
  status: "early" | "on-time" | "delayed";
  label: string;
};

/** Schedule deviation is refreshed on this cadence so it feels live but stable. */
const DRIFT_WINDOW_MS = 2 * 60_000;

function hash(value: string): number {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) out = (out * 31 + value.charCodeAt(i)) % 100000;
  return out;
}

/**
 * Schedule adherence for a bus. Derived deterministically from the bus id and
 * the current time window so every client shows the same status.
 */
export function punctuality(tracked: TrackedBus, now = Date.now()): Punctuality {
  const window = Math.floor(now / DRIFT_WINDOW_MS);
  const seed = hash(`${tracked.bus.id}:${window}`);
  // -4 .. +7 minutes
  const minutes = (seed % 12) - 4;

  if (minutes <= -2) {
    return { minutes, status: "early", label: `${Math.abs(minutes)} min early` };
  }
  if (minutes >= 2) {
    return { minutes, status: "delayed", label: `${minutes} min late` };
  }
  return { minutes, status: "on-time", label: "On time" };
}

export type ScheduledStop = {
  name: string;
  lat: number;
  lng: number;
  /** Scheduled arrival time at this stop for the current run. */
  time: Date;
  index: number;
};

/** Average running time between two consecutive stops, in minutes. */
const MINUTES_PER_STOP = 6;

/**
 * Timetable for the current run of a route: the first stop departs at the top
 * of the most recent half hour and each following stop is spaced evenly.
 */
export function routeSchedule(
  stops: { name: string; lat: number; lng: number }[],
  now = Date.now(),
): ScheduledStop[] {
  const half = 30 * 60_000;
  const start = Math.floor(now / half) * half;
  return stops.map((stop, index) => ({
    ...stop,
    index,
    time: new Date(start + index * MINUTES_PER_STOP * 60_000),
  }));
}

/** Index of the next stop still ahead of the vehicle on the current run. */
export function nextStopIndex(schedule: ScheduledStop[], now = Date.now()): number {
  const found = schedule.findIndex((entry) => entry.time.getTime() >= now);
  return found === -1 ? schedule.length - 1 : found;
}
