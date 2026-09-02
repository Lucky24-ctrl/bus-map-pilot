import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { fetchFleet, fetchRoutes, isLive } from "@/lib/transit";
import { simulateLocation } from "@/lib/simulation";
import type { TrackedBus } from "@/lib/types";

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

  // Test simulation: any bus without a fresh driver ping is animated around
  // the stops of its route so the map always shows moving example buses.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), SIM_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const data = useMemo<TrackedBus[] | undefined>(() => {
    if (!query.data) return query.data;
    return query.data.map((tracked) => {
      if (isLive(tracked.location)) return tracked;
      const simulated = simulateLocation(tracked, now);
      return simulated ? { ...tracked, location: simulated, simulated: true } : tracked;
    });
  }, [query.data, now]);

  return { ...query, data } as typeof query;
}

export function useRoutes() {
  return useQuery({ queryKey: ["routes"], queryFn: fetchRoutes });
}
