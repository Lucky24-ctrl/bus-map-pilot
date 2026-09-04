import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { fetchFleet, fetchRoutes, isLive } from "@/lib/transit";
import { fetchRoadPath } from "@/lib/roads";
import { simulateLocation } from "@/lib/simulation";
import type { LatLng, TrackedBus } from "@/lib/types";

/** How often simulated buses advance along their route, in milliseconds. */
const SIM_TICK_MS = 1000;

/** Fleet (buses + routes + latest positions) with live updates over Realtime. */
export function useFleet() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["fleet"], queryFn: fetchFleet });

  useEffect(() => {
    const channel = supabase
      // Unique per subscriber: two components using this hook must not share
      // one channel, or the second `.on()` runs after `subscribe()` and throws.
      .channel(`live-locations-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_locations" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["fleet"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Road-following geometry for every route, so simulated buses drive along
  // streets instead of cutting across lakes and buildings.
  const routeKey = (query.data ?? [])
    .flatMap((tracked) => (tracked.route ? [tracked.route.id] : []))
    .sort()
    .join(",");

  const { data: roadPaths } = useQuery({
    queryKey: ["route-paths", routeKey],
    enabled: routeKey.length > 0,
    staleTime: Infinity,
    queryFn: async () => {
      const routes = new Map(
        (query.data ?? []).flatMap((tracked) =>
          tracked.route ? [[tracked.route.id, tracked.route] as const] : [],
        ),
      );
      const entries = await Promise.all(
        [...routes.values()].map(async (route) => {
          const stops = route.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }));
          const loop = stops.length > 1 ? [...stops, stops[0]!] : stops;
          return [route.id, await fetchRoadPath(loop)] as const;
        }),
      );
      return new Map<string, LatLng[]>(entries);
    },
  });

  // Test simulation: any bus without a fresh driver ping is animated around
  // the stops of its route so the map always shows moving example buses.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), SIM_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const data = useMemo<TrackedBus[] | undefined>(() => {
    if (!query.data) return query.data;
    return query.data
      // Real buses only appear while their driver is broadcasting GPS; the
      // handful of demo buses stay visible and are animated by the simulation.
      .filter((item) => includeOffline || item.bus.simulated || isLive(item.location))
      .map((item) => {
        const path = item.route ? roadPaths?.get(item.route.id) : undefined;
        const tracked: TrackedBus =
          item.route && path && path.length > 1
            ? { ...item, route: { ...item.route, path } }
            : item;
        if (isLive(tracked.location) || !tracked.bus.simulated) return tracked;
        const simulated = simulateLocation(tracked, now);
        return simulated ? { ...tracked, location: simulated, simulated: true } : tracked;
      });
  }, [query.data, roadPaths, now, includeOffline]);

  return { ...query, data } as typeof query;
}


export function useRoutes() {
  return useQuery({ queryKey: ["routes"], queryFn: fetchRoutes });
}
