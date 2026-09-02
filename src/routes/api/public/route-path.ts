import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-side Geoapify routing: snaps a list of waypoints to the real road
 * network so vehicles animate along streets instead of crossing lakes and
 * buildings. The API key stays on the server.
 *
 * GET /api/public/route-path?waypoints=lat,lng|lat,lng|...
 */
export const Route = createFileRoute("/api/public/route-path")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const apiKey = process.env["GEOAPIFY_API_KEY"];
        if (!apiKey) {
          return Response.json(
            { ok: false, error: "GEOAPIFY_API_KEY secret is not configured" },
            { status: 500 },
          );
        }

        const raw = new URL(request.url).searchParams.get("waypoints")?.trim() ?? "";
        const waypoints = raw
          .split("|")
          .map((pair) => pair.split(",").map((value) => Number(value)))
          .filter(
            (pair): pair is [number, number] =>
              pair.length === 2 &&
              Number.isFinite(pair[0]) &&
              Number.isFinite(pair[1]) &&
              Math.abs(pair[0] as number) <= 90 &&
              Math.abs(pair[1] as number) <= 180,
          );

        if (waypoints.length < 2 || waypoints.length > 25) {
          return Response.json(
            { ok: false, error: "Provide 2-25 'lat,lng' waypoints" },
            { status: 400 },
          );
        }

        const upstream = new URL("https://api.geoapify.com/v1/routing");
        upstream.searchParams.set(
          "waypoints",
          waypoints.map(([lat, lng]) => `${lat},${lng}`).join("|"),
        );
        upstream.searchParams.set("mode", "drive");
        upstream.searchParams.set("apiKey", apiKey);

        const response = await fetch(upstream);
        if (!response.ok) {
          const body = await response.text();
          console.error(`[geoapify] routing failed [${response.status}]: ${body}`);
          return Response.json({ ok: false, status: response.status }, { status: 502 });
        }

        const data = (await response.json()) as {
          features?: Array<{
            geometry?: { type?: string; coordinates?: unknown };
          }>;
        };

        const geometry = data.features?.[0]?.geometry;
        const lines: number[][][] =
          geometry?.type === "LineString"
            ? [(geometry.coordinates as number[][]) ?? []]
            : ((geometry?.coordinates as number[][][]) ?? []);

        const path = lines
          .flat()
          .filter((pair) => Array.isArray(pair) && pair.length >= 2)
          .map((pair) => ({ lat: pair[1] as number, lng: pair[0] as number }));

        return Response.json({ ok: true, path });
      },
    },
  },
});
