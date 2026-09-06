import { createFileRoute } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { InteractiveMap } from "@/components/map/InteractiveMap";
import { useActiveEmergency } from "@/hooks/use-active-emergency";
import { useAmbulances } from "@/hooks/use-ambulances";
import { useEmergencyResponse } from "@/hooks/use-emergency-response";
import { RouteCard } from "@/components/transit/RouteCard";
import { LiveBadge } from "@/components/transit/LiveBadge";
import { PunctualityBadge } from "@/components/transit/PunctualityBadge";
import { useFleet } from "@/hooks/use-fleet";
import { dispatchNearest } from "@/lib/emergency";
import { punctuality } from "@/lib/schedule";
import { formatAgo, formatSpeed, isLive } from "@/lib/transit";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Fleet admin — BusSync" },
      {
        name: "description",
        content: "Operator overview of routes, buses and the freshness of every live signal.",
      },
      { property: "og:title", content: "Fleet admin — BusSync" },
      {
        property: "og:description",
        content: "Operator overview of routes, buses and live signal health.",
      },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { data: fleet = [], isPending } = useFleet({ includeOffline: true });
  const liveAmbulances = useAmbulances();
  const [emergency] = useActiveEmergency();
  const { ambulances, dispatch, arrived } = useEmergencyResponse(liveAmbulances, emergency);
  // The dispatched unit mirrors the passenger page's nearest-ambulance pick.
  const busyId = emergency
    ? (dispatch?.ambulance.id ?? dispatchNearest(liveAmbulances, emergency.at)?.ambulance.id ?? null)
    : null;
  const [routeId, setRouteId] = useState<string | null>(null);

  const routes = [...new Map(fleet.flatMap((t) => (t.route ? [[t.route.id, t.route]] : []))).values()];
  const selectedRoute = routes.find((route) => route.id === routeId) ?? null;
  const liveCount = fleet.filter((t) => isLive(t.location)).length;

  return (
    <AppShell title="Fleet admin" subtitle="Routes, buses and signal health at a glance.">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Routes" value={String(routes.length)} />
        <Stat label="Buses" value={String(fleet.length)} />
        <Stat label="Reporting now" value={`${liveCount}/${fleet.length}`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="flex flex-col gap-3">
          {routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              busCount={fleet.filter((t) => t.route?.id === route.id).length}
              active={route.id === routeId}
              onSelect={(id) => setRouteId(id === routeId ? null : id)}
            />
          ))}
          {!isPending && routes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No routes configured yet.</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <InteractiveMap
            buses={
              selectedRoute ? fleet.filter((t) => t.route?.id === selectedRoute.id) : fleet
            }
            stops={selectedRoute?.stops ?? []}
            ambulances={ambulances}
            emergency={emergency?.at ?? null}
            respondingAmbulanceId={busyId}
            className="h-64 sm:h-80"
          />

          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">Bus</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Speed</th>
                  <th className="px-4 py-3">Last ping</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Schedule</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map((tracked) => (
                  <tr key={tracked.bus.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{tracked.bus.bus_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tracked.route?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">{formatSpeed(tracked.location?.speed)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatAgo(tracked.location?.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <LiveBadge live={isLive(tracked.location)} />
                    </td>
                    <td className="px-4 py-3">
                      <PunctualityBadge value={punctuality(tracked)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel overflow-x-auto">
            <div className="flex items-center gap-2 px-4 pt-4">
              <Siren className="h-4 w-4 text-destructive" />
              <h2 className="font-display text-base font-semibold">Ambulances</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {ambulances.length - (busyId ? 1 : 0)} free · {busyId ? 1 : 0} busy
              </span>
            </div>
            <table className="mt-3 w-full min-w-[32rem] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-y border-border">
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Base hospital</th>
                  <th className="px-4 py-3">Speed</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assignment</th>
                </tr>
              </thead>
              <tbody>
                {ambulances.map((unit) => {
                  const busy = unit.id === busyId;
                  return (
                    <tr key={unit.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{unit.code}</td>
                      <td className="px-4 py-3 text-muted-foreground">{unit.hospital}</td>
                      <td className="px-4 py-3">{Math.round(unit.speedKmh)} km/h</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            busy
                              ? "inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive"
                              : "inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-500"
                          }
                        >
                          <span
                            className={
                              busy
                                ? "h-1.5 w-1.5 rounded-full bg-destructive"
                                : "h-1.5 w-1.5 rounded-full bg-emerald-500"
                            }
                          />
                          {busy ? "Busy — responding" : "Free"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {busy && emergency
                          ? `${emergency.placeName} · ${
                              arrived
                                ? "arrived"
                                : dispatch
                                  ? `${dispatch.etaMinutes} min ETA`
                                  : "en route"
                            }`
                          : "On patrol"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
