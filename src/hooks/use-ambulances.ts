import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AMBULANCES, ambulancePosition, type AmbulancePosition } from "@/lib/ambulances";
import { fetchRoadPath } from "@/lib/roads";
import type { LatLng } from "@/lib/types";

const TICK_MS = 1000;

/** Live (simulated) ambulance positions that follow real road geometry. */
export function useAmbulances(): AmbulancePosition[] {
  const { data: paths } = useQuery({
    queryKey: ["ambulance-paths"],
    staleTime: Infinity,
    queryFn: async () => {
      const entries = await Promise.all(
        AMBULANCES.map(async (unit) => {
          const loop = [...unit.waypoints, unit.waypoints[0]!];
          return [unit.id, await fetchRoadPath(loop)] as const;
        }),
      );
      return new Map<string, LatLng[]>(entries);
    },
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(
    () =>
      AMBULANCES.flatMap((unit) => {
        const position = ambulancePosition(unit, paths?.get(unit.id) ?? [], now);
        return position ? [position] : [];
      }),
    [paths, now],
  );
}
