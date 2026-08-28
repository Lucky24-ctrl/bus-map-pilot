import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/AppShell";
import { InteractiveMap } from "@/components/map/InteractiveMap";
import { LiveBadge } from "@/components/transit/LiveBadge";
import { useFleet } from "@/hooks/use-fleet";
import { formatAgo, isLive } from "@/lib/transit";
import { formatClock } from "@/lib/nearby";
import { nextStopEta } from "@/lib/simulation";

export const Route = createFileRoute("/passenger/bus/$id")({
  head: () => ({
    meta: [
      { title: "Bus details — BusSync" },
      {
        name: "description",
        content: "Follow a single bus: its last updated location, estimated arrival and route stops.",
      },
      { property: "og:title", content: "Bus details — BusSync" },
      {
        property: "og:description",
        content: "Follow a single bus: last updated location, ETA and its route stops.",
      },
    ],
  }),
  component: BusDetail,
});

type ReverseGeocode = { formatted: string | null };

function useLastLocationName(lat: number | null, lng: number | null) {
  // Round so tiny movements don't re-trigger a lookup every second.
  const key = lat != null && lng != null ? `${lat.toFixed(3)},${lng.toFixed(3)}` : null;
  return useQuery({
    queryKey: ["reverse-geocode", key],
    enabled: key != null,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ReverseGeocode> => {
      const response = await fetch(`/api/public/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (!response.ok) throw new Error("reverse geocode failed");
      return (await response.json()) as ReverseGeocode;
    },
  });
}

function BusDetail() {
  const { id } = Route.useParams();
  const { data: fleet = [], isPending } = useFleet();
  const tracked = fleet.find((item) => item.bus.id === id) ?? null;
  const location = tracked?.location ?? null;
  const { data: place } = useLastLocationName(
    location?.latitude ?? null,
    location?.longitude ?? null,
  );

  if (isPending) {
    return (
      <AppShell title="Loading bus…">
        <p className="text-sm text-muted-foreground">Fetching the latest position.</p>
      </AppShell>
    );
  }

  if (!tracked) {
    return (
      <AppShell title="Bus not found" subtitle="This bus is not part of the tracked fleet.">
        <Link to="/passenger" className="text-sm text-accent underline">
          Back to the live map
        </Link>
      </AppShell>
    );
  }

  const { bus, route } = tracked;
  const eta = nextStopEta(tracked);

  return (
    <AppShell title={bus.bus_number} subtitle={route?.name ?? "Unassigned route"}>
      <div className="mb-4 flex items-center gap-2">
        <LiveBadge live={isLive(location)} />
        {tracked.simulated ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Simulated
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <InteractiveMap
          buses={[tracked]}
          stops={route?.stops ?? []}
          selectedBusId={bus.id}
          className="h-[20rem] sm:h-[28rem]"
        />

        <div className="flex flex-col gap-4">
          <div className="panel p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Last updated location
            </p>
            <p className="mt-1 font-display text-base font-semibold leading-snug">
              {place?.formatted ??
                (location
                  ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : "No position yet")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Updated {formatAgo(location?.updated_at)}
            </p>
          </div>

          <div className="panel p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              ETA — next stop
            </p>
            {eta ? (
              <>
                <p className="mt-1 font-display text-2xl font-semibold leading-none">
                  {eta.minutes} min
                </p>
                <p className="mt-1.5 text-sm">{eta.stopName}</p>
                <p className="text-xs text-muted-foreground">
                  Arriving around {formatClock(eta.arrival)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No estimate available.</p>
            )}
          </div>

          <div className="panel p-4">
            <h2 className="font-display text-sm font-semibold">Stops</h2>
            <ol className="mt-3 space-y-2">
              {(route?.stops ?? []).map((stop, index) => (
                <li key={stop.name} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/50 text-[11px] text-accent">
                    {index + 1}
                  </span>
                  {stop.name}
                </li>
              ))}
              {(route?.stops.length ?? 0) === 0 ? (
                <li className="text-sm text-muted-foreground">No stops configured.</li>
              ) : null}
            </ol>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
