import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { AmbulancePosition } from "@/lib/ambulances";
import { isLive } from "@/lib/transit";
import type { LatLng, Stop, TrackedBus } from "@/lib/types";

const ATTRIBUTION =
  'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

type LeafletMapProps = {
  center: LatLng;
  zoom?: number;
  apiKey: string;
  buses?: TrackedBus[];
  stops?: Stop[];
  marker?: LatLng | null;
  focus?: (LatLng & { zoom?: number }) | null;
  selectedBusId?: string | null;
  ambulances?: AmbulancePosition[];
  className?: string;
};

function busIcon(color: string, selected: boolean): L.DivIcon {
  const size = selected ? 30 : 24;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};border:2px solid #ffffff;
      box-shadow:0 1px 4px rgba(0,0,0,.45);
      font-size:${selected ? 15 : 12}px;line-height:1;
    ">🚌</span>`,
  });
}

function ambulanceIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<span class="ambulance-beacon">
      <span class="ambulance-beacon__pulse"></span>
      <span class="ambulance-beacon__core">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path fill="#ffffff" d="M9.5 2h5v5.5H20v5h-5.5V18h-5v-5.5H4v-5h5.5z"/>
        </svg>
      </span>
    </span>`,
  });
}

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<span style="
      display:block;width:22px;height:22px;border-radius:9999px;
      background:#e11d48;border:3px solid #ffffff;
      box-shadow:0 1px 4px rgba(0,0,0,.45);
    "></span>`,
  });
}

/**
 * Interactive Leaflet map rendered with real Geoapify raster tiles.
 *
 * Browser-only module: it imports Leaflet (and its CSS), so it must only
 * ever be loaded through React.lazy behind <ClientOnly> — never statically
 * imported from an SSR-reachable module.
 *
 * Supports zoom in/out, mouse + touch drag and panning out of the box,
 * stays responsive via a ResizeObserver, and draws live bus markers,
 * route stops and one-off pins on top of the tiles.
 */
export default function LeafletMap({
  center,
  zoom = 13,
  apiKey,
  buses = [],
  stops = [],
  marker = null,
  focus = null,
  selectedBusId = null,
  ambulances = [],
  className,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const fittedKeyRef = useRef<string>("");
  const [tileError, setTileError] = useState(false);

  // Create the map once on mount.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
    });

    const tiles = L.tileLayer(
      `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`,
      { maxZoom: 20, attribution: ATTRIBUTION },
    );
    tiles.on("tileerror", () => setTileError(true));
    tiles.addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // The map is created once on mount; center/zoom/apiKey are stable props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw overlays whenever fleet/stop data changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const points: L.LatLngExpression[] = [];

    const drawnPaths = new Set<string>();
    for (const tracked of buses) {
      const path = tracked.route?.path;
      if (!path || path.length < 2) continue;
      const key = tracked.route!.id;
      if (drawnPaths.has(key)) continue;
      drawnPaths.add(key);
      L.polyline(
        path.map((point) => [point.lat, point.lng] as L.LatLngExpression),
        { color: "#38bdf8", weight: 4, opacity: 0.75 },
      ).addTo(layer);
    }

    if (drawnPaths.size === 0 && stops.length > 1) {
      L.polyline(
        stops.map((stop) => [stop.lat, stop.lng] as L.LatLngExpression),
        { color: "#38bdf8", weight: 3, opacity: 0.7 },
      ).addTo(layer);
    }

    for (const stop of stops) {
      const at: L.LatLngExpression = [stop.lat, stop.lng];
      points.push(at);
      L.circleMarker(at, {
        radius: 4,
        color: "#38bdf8",
        weight: 2,
        fillColor: "#0f172a",
        fillOpacity: 1,
      })
        .bindTooltip(stop.name)
        .addTo(layer);
    }


    for (const tracked of buses) {
      const location = tracked.location;
      if (!location) continue;
      const at: L.LatLngExpression = [location.latitude, location.longitude];
      points.push(at);
      const selected = selectedBusId != null && selectedBusId === tracked.bus.id;
      const color = selected ? "#f43f5e" : isLive(location) ? "#f59e0b" : "#64748b";
      L.marker(at, { icon: busIcon(color, selected) })
        .bindTooltip(tracked.bus.bus_number)
        .addTo(layer);
    }

    for (const unit of ambulances) {
      const at: L.LatLngExpression = [unit.lat, unit.lng];
      points.push(at);
      L.marker(at, { icon: ambulanceIcon(), zIndexOffset: 1000 })
        .bindTooltip(`${unit.code} · ${unit.hospital}`)
        .addTo(layer);
    }

    if (marker) {
      const at: L.LatLngExpression = [marker.lat, marker.lng];
      points.push(at);
      L.marker(at, { icon: pinIcon() }).addTo(layer);
    }

    // Fit the view to the data only when the set of tracked buses changes,
    // so live position updates never yank the viewport away from the user.
    const fitKey = buses
      .map((tracked) => tracked.bus.id)
      .sort()
      .join(",");
    if (points.length > 0 && fitKey !== fittedKeyRef.current) {
      fittedKeyRef.current = fitKey;
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    }
  }, [buses, stops, marker, selectedBusId, ambulances]);

  // Pan/zoom to a searched place whenever the focus target changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo([focus.lat, focus.lng], focus.zoom ?? 15, { duration: 0.8 });
  }, [focus]);



  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className={className ?? "h-full w-full"} />
      {tileError ? (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-1 bg-background/90 p-4 text-center">
          <p className="text-sm font-medium text-destructive">Map tiles failed to load</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            The Geoapify API key appears to be missing or invalid. Check the GEOAPIFY_API_KEY
            secret and try again.
          </p>
        </div>
      ) : null}
    </div>
  );
}
