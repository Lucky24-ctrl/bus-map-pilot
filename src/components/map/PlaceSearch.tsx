import { Loader2, MapPin, Search } from "lucide-react";
import { useState } from "react";

import type { LatLng } from "@/lib/types";

type GeocodeResult = {
  name: string;
  formatted: string | null;
  lat: number | null;
  lng: number | null;
};

/**
 * Stop / place search box backed by the server-side Geoapify geocoding
 * route (/api/public/geocode). Selecting a result hands its coordinates
 * back so the map can pan and zoom to it.
 */
export function PlaceSearch({
  onSelect,
}: {
  onSelect: (place: LatLng & { name: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/geocode?q=${encodeURIComponent(q)}`);
      const data = (await response.json()) as { ok: boolean; results?: GeocodeResult[] };
      if (!response.ok || !data.ok) throw new Error("Search failed");
      setResults((data.results ?? []).filter((item) => item.lat != null && item.lng != null));
    } catch {
      setError("Could not search right now. Try again.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a stop or place…"
            aria-label="Search a stop or place"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Search
        </button>
      </form>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {results ? (
        results.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matching places found.</p>
        ) : (
          <ul className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1">
            {results.map((result, index) => (
              <li key={`${result.name}-${index}`}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect({ lat: result.lat!, lng: result.lng!, name: result.name });
                    setResults(null);
                  }}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">{result.name}</span>
                    {result.formatted ? (
                      <span className="block text-xs text-muted-foreground">
                        {result.formatted}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
