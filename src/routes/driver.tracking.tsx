import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleDot, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { InteractiveMap } from "@/components/map/InteractiveMap";
import { PunctualityBadge } from "@/components/transit/PunctualityBadge";
import { useDriverGeolocation } from "@/hooks/use-driver-geolocation";
import { useFleet } from "@/hooks/use-fleet";
import { locationPushIntervalMs } from "@/lib/config";
import { punctuality } from "@/lib/schedule";
import { isLive, pushLocation } from "@/lib/transit";

type TrackingSearch = { busId?: string | undefined };

export const Route = createFileRoute("/driver/tracking")({
  validateSearch: (search: Record<string, unknown>): TrackingSearch => ({
    busId: typeof search['busId'] === "string" ? search['busId'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Broadcasting location — BusSync" },
      {
        name: "description",
        content: "Live driver console broadcasting GPS position to passengers.",
      },
      { property: "og:title", content: "Broadcasting location — BusSync" },
      {
        property: "og:description",
        content: "Live driver console broadcasting GPS position to passengers.",
      },
    ],
  }),
  component: DriverTracking,
});

function DriverTracking() {
  const { busId } = Route.useSearch();
  const { data: fleet = [] } = useFleet({ includeOffline: true });
  const tracked = fleet.find((item) => item.bus.id === busId) ?? null;

  const [broadcasting, setBroadcasting] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const { position, error, coarse } = useDriverGeolocation(broadcasting);
  const positionRef = useRef(position);
  positionRef.current = position;

  useEffect(() => {
    if (!broadcasting || !busId) return;
    const send = async () => {
      const current = positionRef.current;
      if (!current) return;
      try {
        await pushLocation({
          busId,
          latitude: current.latitude,
          longitude: current.longitude,
          speed: current.speed,
          heading: current.heading,
          accuracy: current.accuracy,
        });
        setLastSent(new Date());
        setSendError(null);
      } catch (err) {
        setSendError(err instanceof Error ? err.message : "Failed to send location");
      }
    };
    void send();
    const timer = setInterval(() => void send(), locationPushIntervalMs);
    return () => clearInterval(timer);
  }, [broadcasting, busId]);

  if (!busId) {
    return (
      <AppShell title="No bus selected">
        <Link to="/driver" className="text-sm text-accent underline">
          Choose your bus first
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={tracked ? `Driving ${tracked.bus.bus_number}` : "Driver console"}
      subtitle={tracked?.route?.name ?? "Route not assigned"}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <InteractiveMap
          buses={tracked ? [tracked] : []}
          stops={tracked?.route?.stops ?? []}
          marker={position ? { lat: position.latitude, lng: position.longitude } : null}
          markerAccuracy={position?.accuracy ?? null}
          className="h-[20rem] sm:h-[28rem]"
        />

        <div className="flex flex-col gap-4">
          <div className="panel p-5">
            <button
              type="button"
              onClick={() => setBroadcasting((value) => !value)}
              className={
                broadcasting
                  ? "w-full rounded-lg border border-destructive px-4 py-2.5 text-sm font-medium text-destructive"
                  : "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              }
            >
              {broadcasting ? "Stop broadcasting" : "Start broadcasting"}
            </button>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Latitude" value={position?.latitude.toFixed(5) ?? "—"} />
              <Row label="Longitude" value={position?.longitude.toFixed(5) ?? "—"} />
              <Row
                label="Speed"
                value={position?.speed != null ? `${Math.round(position.speed)} km/h` : "—"}
              />
              <Row
                label="Accuracy"
                value={position?.accuracy != null ? `±${Math.round(position.accuracy)} m` : "—"}
              />
              <Row label="Last sent" value={lastSent ? lastSent.toLocaleTimeString() : "—"} />
            </dl>
            {coarse ? (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Location is approximate right now (coarse network fix). Move to an open area or
                wait a few seconds for GPS to lock.
              </p>
            ) : null}
            {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
            {sendError ? <p className="mt-1 text-xs text-destructive">{sendError}</p> : null}
          </div>

          {tracked?.route ? (
            <div className="panel p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-semibold">Route stops &amp; schedule</h2>
                <PunctualityBadge value={punctuality(tracked)} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {tracked.route.name} · {tracked.route.stops.length} stops
              </p>
              <ol className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {tracked.route.stops.map((stop, index) => (
                  <li key={`${stop.name}-${index}`} className="flex items-center gap-2.5 text-sm">
                    {isLive(tracked.location) &&
                    Math.abs(stop.lat - tracked.location!.latitude) < 0.002 &&
                    Math.abs(stop.lng - tracked.location!.longitude) < 0.002 ? (
                      <CircleDot className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">
                      <span className="text-xs text-muted-foreground">{index + 1}. </span>
                      {stop.name}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Position is sent every {locationPushIntervalMs / 1000} seconds while broadcasting is on.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
