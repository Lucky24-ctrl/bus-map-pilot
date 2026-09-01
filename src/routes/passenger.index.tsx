import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { InteractiveMap } from "@/components/map/InteractiveMap";
import { useFleet } from "@/hooks/use-fleet";
import { PlaceSearch } from "@/components/map/PlaceSearch";
import { PunctualityBadge } from "@/components/transit/PunctualityBadge";
import { defaultCenter } from "@/lib/config";
import { formatClock, nearbyStops, routeOptionsFor, toMiles } from "@/lib/nearby";
import { punctuality } from "@/lib/schedule";
import { isLive } from "@/lib/transit";

export const Route = createFileRoute("/passenger/")({
  head: () => ({
    meta: [
      { title: "Live bus map — BusSync" },
      {
        name: "description",
        content:
          "Search a location, see nearby bus stops and pick a route with its next departure on the live map.",
      },
      { property: "og:title", content: "Live bus map — BusSync" },
      {
        property: "og:description",
        content:
          "Search a location, see nearby bus stops and pick a route with its next departure on the live map.",
      },
    ],
  }),
  component: PassengerMap,
});

function PassengerMap() {
  const { data: fleet = [], isPending, error } = useFleet();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [place, setPlace] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [showAllStops, setShowAllStops] = useState(false);

  const origin = place ? { lat: place.lat, lng: place.lng } : defaultCenter;

  const stops = useMemo(() => nearbyStops(fleet, origin, 12), [fleet, origin]);
  const options = useMemo(
    () => (place ? routeOptionsFor(fleet, origin, 5) : []),
    [fleet, origin, place],
  );
  const trackedById = useMemo(
    () => new Map(fleet.map((item) => [item.bus.id, item])),
    [fleet],
  );

  const visibleStops = showAllStops ? stops : stops.slice(0, 3);
  const liveCount = fleet.filter((t) => isLive(t.location)).length;

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="relative">
          <InteractiveMap
            buses={fleet}
            stops={place ? options.map((option) => option.stop) : []}
            marker={place ? { lat: place.lat, lng: place.lng } : null}
            focus={place}
            selectedBusId={selectedId}
            className="h-[24rem] sm:h-[34rem]"
          />
          <div className="absolute left-3 right-3 top-10 z-[1000] rounded-xl bg-background/95 p-2 shadow-panel backdrop-blur">
            <PlaceSearch onSelect={setPlace} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {place ? (
            <section className="panel p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold">Routes near you</h2>
                <button
                  type="button"
                  onClick={() => setPlace(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{place.name}</p>

              <div className="mt-3 flex flex-col divide-y divide-border">
                {options.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">
                    No routes serve stops near this location.
                  </p>
                ) : (
                  options.map((option) => (
                    <div key={option.key} className="flex items-start gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-semibold">
                          {option.stopName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {option.routeName}
                          {option.busNumber ? ` · ${option.busNumber}` : ""}
                        </p>
                        {option.busId && trackedById.get(option.busId) ? (
                          <PunctualityBadge
                            value={punctuality(trackedById.get(option.busId)!)}
                            className="mt-1.5"
                          />
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground">Departure on:</p>
                        <p className="font-display text-lg font-semibold leading-none">
                          {formatClock(option.departure)}
                        </p>
                        <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {option.miles.toFixed(1)} miles
                        </p>
                        {option.busId ? (
                          <Link
                            to="/passenger/bus/$id"
                            params={{ id: option.busId }}
                            className="mt-2 inline-block rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                          >
                            Select
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedId(null)}
                            disabled
                            className="mt-2 inline-block rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground"
                          >
                            No bus
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : (
            <section className="panel p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold">Nearby stops</h2>
                {stops.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllStops((value) => !value)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showAllStops ? "show less" : "view all"}
                  </button>
                ) : null}
              </div>

              {error ? (
                <p className="mt-3 text-sm text-destructive">Could not load stops.</p>
              ) : isPending ? (
                <p className="mt-3 text-sm text-muted-foreground">Loading stops…</p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {visibleStops.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background">
                        <Bus className="h-4 w-4 text-primary" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{entry.stop.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.routeName} · {toMiles(entry.km).toFixed(1)} miles
                        </p>
                      </div>
                    </div>
                  ))}
                  {visibleStops.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No stops yet.</p>
                  ) : null}
                </div>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                {liveCount} of {fleet.length} buses currently reporting
              </p>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
