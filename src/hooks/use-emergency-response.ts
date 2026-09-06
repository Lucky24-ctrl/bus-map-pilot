import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { AmbulancePosition } from "@/lib/ambulances";
import { dispatchNearest, type Dispatch, type EmergencyRequest } from "@/lib/emergency";
import { distanceKm } from "@/lib/nearby";
import { fetchRoadPath } from "@/lib/roads";
import { buildPath, pathLengthKm, pointAlong } from "@/lib/simulation";
import type { LatLng } from "@/lib/types";

/** Emergency response cruising speed in km/h (50-60 range). */
const RESPONSE_SPEED_KMH = 55;
const TICK_MS = 1000;

type Assignment = {
  requestId: string;
  ambulanceId: string;
  from: LatLng;
  startedAt: number;
};

export type EmergencyResponse = {
  /** Ambulance list with the responder moved onto its response run. */
  ambulances: AmbulancePosition[];
  dispatch: Dispatch | null;
  /** Road geometry the responder is driving. */
  path: LatLng[];
  arrived: boolean;
};

/**
 * Once a passenger flags an emergency, the nearest ambulance is locked in and
 * driven along the shortest road route to the incident at ~55 km/h.
 */
export function useEmergencyResponse(
  ambulances: AmbulancePosition[],
  request: EmergencyRequest | null,
): EmergencyResponse {
  const assignment = useRef<Assignment | null>(null);

  if (!request) {
    assignment.current = null;
  } else if (assignment.current?.requestId !== request.id) {
    const nearest = dispatchNearest(ambulances, request.at);
    if (nearest) {
      assignment.current = {
        requestId: request.id,
        ambulanceId: nearest.ambulance.id,
        from: { lat: nearest.ambulance.lat, lng: nearest.ambulance.lng },
        startedAt: Date.now(),
      };
    }
  }

  const active = request ? assignment.current : null;

  const { data: road } = useQuery({
    queryKey: ["emergency-path", active?.requestId ?? "none"],
    enabled: Boolean(active),
    staleTime: Infinity,
    queryFn: async () => fetchRoadPath([active!.from, request!.at]),
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [active?.requestId]);

  return useMemo<EmergencyResponse>(() => {
    if (!request || !active) {
      return { ambulances, dispatch: null, path: [], arrived: false };
    }

    const points: LatLng[] = road && road.length > 1 ? road : [active.from, request.at];
    const path = buildPath(points);
    const total = pathLengthKm(path);
    const travelled = ((now - active.startedAt) / 3_600_000) * RESPONSE_SPEED_KMH;
    const point = pointAlong(path, travelled);

    const base = ambulances.find((unit) => unit.id === active.ambulanceId);
    if (!base || !point) {
      return { ambulances, dispatch: null, path: points, arrived: false };
    }

    const responder: AmbulancePosition = {
      ...base,
      lat: point.at.lat,
      lng: point.at.lng,
      heading: point.heading,
      speedKmh: point.done ? 0 : RESPONSE_SPEED_KMH,
    };

    const remainingKm = point.done ? 0 : Math.max(0, total - Math.max(0, travelled));
    const straightKm = distanceKm({ lat: responder.lat, lng: responder.lng }, request.at);

    return {
      ambulances: ambulances.map((unit) => (unit.id === responder.id ? responder : unit)),
      dispatch: {
        ambulance: responder,
        km: remainingKm > 0 ? remainingKm : straightKm,
        etaMinutes: point.done
          ? 0
          : Math.max(1, Math.round((remainingKm / RESPONSE_SPEED_KMH) * 60)),
      },
      path: points,
      arrived: point.done,
    };
  }, [ambulances, request, active, road, now]);
}
