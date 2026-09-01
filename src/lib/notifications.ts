import { punctuality } from "./schedule";
import { formatAgo, isLive } from "./transit";
import type { TrackedBus } from "./types";

export type Notification = {
  id: string;
  title: string;
  body: string;
  tone: "info" | "warning" | "success";
};

/** Derives passenger-facing alerts from the current fleet snapshot. */
export function buildNotifications(fleet: TrackedBus[]): Notification[] {
  const out: Notification[] = [];

  for (const tracked of fleet) {
    const status = punctuality(tracked);
    const name = tracked.bus.bus_number;
    const route = tracked.route?.name ?? "Unassigned route";

    if (status.status === "delayed") {
      out.push({
        id: `delay-${tracked.bus.id}`,
        title: `${name} is running late`,
        body: `${route} · ${status.label}`,
        tone: "warning",
      });
    } else if (status.status === "early") {
      out.push({
        id: `early-${tracked.bus.id}`,
        title: `${name} is arriving early`,
        body: `${route} · ${status.label}`,
        tone: "success",
      });
    }

    if (!isLive(tracked.location) && !tracked.simulated) {
      out.push({
        id: `signal-${tracked.bus.id}`,
        title: `${name} lost signal`,
        body: `Last ping ${formatAgo(tracked.location?.updated_at)}`,
        tone: "info",
      });
    }
  }

  return out.slice(0, 12);
}
