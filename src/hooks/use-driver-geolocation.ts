import { useCallback, useEffect, useRef, useState } from "react";

export type DriverPosition = {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  timestamp: number;
};

/** Readings worse than this (in metres) are treated as coarse network fixes. */
const COARSE_ACCURACY_M = 100;
/** First fix must be at least this accurate, otherwise we wait for a better one. */
const FIRST_FIX_ACCURACY_M = 60;
/** A jump faster than this (m/s) between fixes is a GPS glitch — drop it. */
const MAX_PLAUSIBLE_MPS = 55;
/** How long a good fix stays trusted before a coarse reading may replace it. */
const GOOD_FIX_TTL_MS = 20_000;

/**
 * Watches the browser Geolocation API while `active` is true.
 *
 * Uses high-accuracy GPS with no cached positions, and filters out coarse
 * Wi-Fi/IP fixes while a recent precise fix is still available, so the
 * reported position does not jump around by hundreds of metres.
 */
export function useDriverGeolocation(active: boolean) {
  const [position, setPosition] = useState<DriverPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastGood = useRef<DriverPosition | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    setError(null);
    lastGood.current = null;

    const handle = (pos: GeolocationPosition) => {
      const next: DriverPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
        heading: pos.coords.heading ?? null,
        accuracy: pos.coords.accuracy ?? null,
        timestamp: pos.timestamp,
      };

      const accuracy = next.accuracy ?? Number.POSITIVE_INFINITY;
      const previous = lastGood.current;

      // Ignore the very first fix while it is still a rough network estimate —
      // GPS usually sharpens within a few seconds.
      if (!previous && accuracy > FIRST_FIX_ACCURACY_M) return;

      // Drop impossible teleports (GPS glitches) faster than a moving bus.
      if (previous) {
        const dLat = next.latitude - previous.latitude;
        const dLng =
          (next.longitude - previous.longitude) * Math.cos((next.latitude * Math.PI) / 180);
        const metres = Math.hypot(dLat, dLng) * 111_320;
        const seconds = Math.max(1, (next.timestamp - previous.timestamp) / 1000);
        if (metres / seconds > MAX_PLAUSIBLE_MPS && metres > accuracy + (previous.accuracy ?? 0)) {
          return;
        }
      }

      const previousIsFresh =
        previous != null && next.timestamp - previous.timestamp < GOOD_FIX_TTL_MS;

      // Drop a coarse fix when a recent, clearly better one is still valid.
      if (
        accuracy > COARSE_ACCURACY_M &&
        previousIsFresh &&
        (previous?.accuracy ?? Number.POSITIVE_INFINITY) < accuracy
      ) {
        return;
      }

      if (accuracy <= COARSE_ACCURACY_M) lastGood.current = next;
      setPosition(next);
      setError(null);
    };

    watchId.current = navigator.geolocation.watchPosition(
      handle,
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );

    // Kick off an immediate high-accuracy read so the first fix is not delayed.
    navigator.geolocation.getCurrentPosition(handle, () => undefined, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    });

    return stop;
  }, [active, stop]);

  const accuracy = position?.accuracy ?? null;
  return {
    position,
    error,
    /** True while the only available fix is a coarse network estimate. */
    coarse: accuracy != null && accuracy > COARSE_ACCURACY_M,
  };
}
