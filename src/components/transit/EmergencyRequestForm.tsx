import { useState } from "react";
import { AlertTriangle, Crosshair, Siren } from "lucide-react";

import type { AmbulancePosition } from "@/lib/ambulances";
import {
  EMERGENCY_KINDS,
  dispatchNearest,
  type Dispatch,
  type EmergencyKind,
  type EmergencyRequest,
} from "@/lib/emergency";
import type { LatLng } from "@/lib/types";

type Props = {
  ambulances: AmbulancePosition[];
  /** Currently searched/selected place used as the default incident location. */
  place: (LatLng & { name: string }) | null;
  request: EmergencyRequest | null;
  dispatch: Dispatch | null;
  onSubmit: (request: EmergencyRequest) => void;
  onCancel: () => void;
};

/** Passenger-facing emergency form: flags an incident and dispatches the nearest ambulance. */
export function EmergencyRequestForm({
  ambulances,
  place,
  request,
  dispatch,
  onSubmit,
  onCancel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<EmergencyKind>("medical");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const [at, setAt] = useState<(LatLng & { name: string }) | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = at ?? place;

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Location is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAt({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: `My location (±${Math.round(pos.coords.accuracy)} m)`,
        });
        setError(null);
        setLocating(false);
      },
      (err) => {
        setError(err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };

  if (request) {
    return (
      <section className="panel border border-destructive/50 p-4">
        <div className="flex items-center gap-2">
          <Siren className="h-4 w-4 text-destructive" />
          <h2 className="font-display text-base font-semibold">Help is on the way</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{request.placeName}</p>
        {dispatch ? (
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Responding unit</dt>
              <dd className="font-medium">{dispatch.ambulance.code}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">From</dt>
              <dd className="max-w-[10rem] truncate text-right">{dispatch.ambulance.hospital}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Distance</dt>
              <dd>{dispatch.km.toFixed(1)} km</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">ETA</dt>
              <dd className="font-display text-base font-semibold">{dispatch.etaMinutes} min</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Locating the nearest ambulance…</p>
        )}
        <button
          type="button"
          onClick={() => {
            onCancel();
            setOpen(false);
            setNote("");
          }}
          className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm"
        >
          Cancel request
        </button>
      </section>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground shadow-panel"
      >
        <AlertTriangle className="h-4 w-4" />
        Request emergency help
      </button>
    );
  }

  return (
    <section className="panel border border-destructive/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">Emergency request</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <form
        className="mt-3 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!target) {
            setError("Pick a location: search a place or use your current location.");
            return;
          }
          const created: EmergencyRequest = {
            id: `er-${Date.now()}`,
            kind,
            note,
            contact,
            at: { lat: target.lat, lng: target.lng },
            placeName: target.name,
            createdAt: Date.now(),
          };
          setError(null);
          onSubmit(created);
        }}
      >
        <div>
          <label htmlFor="kind" className="text-xs uppercase tracking-wider text-muted-foreground">
            Type
          </label>
          <select
            id="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as EmergencyKind)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {EMERGENCY_KINDS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Location</span>
          <p className="mt-1 truncate text-sm">{target?.name ?? "No location selected"}</p>
          <button
            type="button"
            onClick={useMyLocation}
            className="mt-2 flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {locating ? "Locating…" : "Use my current location"}
          </button>
        </div>

        <div>
          <label
            htmlFor="contact"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Contact number
          </label>
          <input
            id="contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            inputMode="tel"
            placeholder="Optional"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="note" className="text-xs uppercase tracking-wider text-muted-foreground">
            What happened?
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <button
          type="submit"
          className="w-full rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground"
        >
          Send request ({dispatchNearest(ambulances, target ?? { lat: 0, lng: 0 })?.ambulance.code ??
            "no unit"}{" "}
          nearest)
        </button>
      </form>
    </section>
  );
}
