import { createFileRoute, Link } from "@tanstack/react-router";
import { Gauge, MapPinned, Radio } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BusSync — Real-time city bus tracking" },
      {
        name: "description",
        content:
          "Track city buses live on a map. Passengers see buses move in real time; drivers share their position with one tap.",
      },
      { property: "og:title", content: "BusSync — Real-time city bus tracking" },
      {
        property: "og:description",
        content: "Flightradar-style live tracking for city buses, powered by realtime GPS pings.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: Radio,
    title: "Realtime pings",
    body: "Driver devices push GPS every few seconds and every passenger map updates instantly.",
  },
  {
    icon: MapPinned,
    title: "Routes and stops",
    body: "Each bus is tied to a route so you can see the line it follows and its next stops.",
  },
  {
    icon: Gauge,
    title: "Speed and freshness",
    body: "Speed, heading and last-seen time make it obvious whether a bus is really moving.",
  },
];

function Home() {
  return (
    <AppShell>
      <section className="mx-auto max-w-2xl text-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-live" /> Prototype · live vehicle feed
          </span>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            See every city bus move, live.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            BusSync is a Flightradar-style tracker for public buses. Drivers share their device
            location; passengers watch the fleet crawl across the map in real time.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/passenger"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open live map
            </Link>
            <Link
              to="/driver"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              I'm a driver
            </Link>
          </div>
        </div>

      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="panel p-5">
            <feature.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 font-display text-base font-semibold">{feature.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
