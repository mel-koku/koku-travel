import type { RoutingRequest, RoutingResult, RoutingLeg, RoutingLegStep } from "./types";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { TIMEOUT_10_SECONDS } from "@/lib/constants";

// -- NAVITIME Route(totalnavi) response types --

type NavitimeCoord = { lat: number; lon: number };

type NavitimePointSection = {
  type: "point";
  coord: NavitimeCoord;
  name: string;
  node_id?: string;
  node_types?: string[];
  gateway?: string;
  numbering?: {
    departure?: Array<{ symbol: string; number: string }>;
    arrival?: Array<{ symbol: string; number: string }>;
  };
};

type NavitimeTransportLink = {
  id: string;
  name: string;
  direction?: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
  destination?: { id: string; name: string };
  way?: string;
};

type NavitimeMoveSection = {
  type: "move";
  move?: "walk";
  next_transit?: boolean;
  from_time: string;
  to_time: string;
  time: number; // minutes
  distance: number; // meters
  line_name?: string;
  transport?: {
    name: string;
    color?: string;
    type?: string;
    company?: { id: string; name: string };
    links?: NavitimeTransportLink[];
    getoff?: string;
  };
};

type NavitimeSection = NavitimePointSection | NavitimeMoveSection;

type NavitimeRoute = {
  summary: {
    move: {
      transit_count: number;
      walk_distance: number;
      from_time: string;
      to_time: string;
      time: number;
      distance: number;
      fare?: Record<string, number>;
    };
  };
  sections: NavitimeSection[];
};

type NavitimeResponse = {
  items: NavitimeRoute[];
};

/**
 * Map NAVITIME vehicle/train type to Google-compatible vehicle type string.
 */
function mapVehicleType(transportName: string): string {
  const lower = transportName.toLowerCase();
  if (lower.includes("新幹線") || lower.includes("shinkansen")) return "HEAVY_RAIL";
  if (lower.includes("メトロ") || lower.includes("metro") || lower.includes("地下鉄") || lower.includes("subway")) return "SUBWAY";
  if (lower.includes("バス") || lower.includes("bus")) return "BUS";
  if (lower.includes("路面") || lower.includes("tram")) return "TRAM";
  if (lower.includes("フェリー") || lower.includes("ferry")) return "FERRY";
  if (lower.includes("モノレール") || lower.includes("monorail")) return "RAIL";
  return "RAIL";
}

/**
 * Format station numbering (e.g., JY17) for display alongside Japanese name.
 */
function formatNumbering(numbering?: NavitimePointSection["numbering"], which?: "departure" | "arrival"): string | undefined {
  const arr = which === "arrival" ? numbering?.arrival : numbering?.departure;
  if (!arr || arr.length === 0) return undefined;
  return arr.map((n) => `${n.symbol}${n.number}`).join("/");
}

/**
 * Build a display-friendly station name.
 * Returns "東京 (JY01)" when numbering is available, otherwise just the Japanese name.
 */
function stationDisplayName(point: NavitimePointSection, which: "departure" | "arrival"): string {
  const num = formatNumbering(point.numbering, which);
  return num ? `${point.name} (${num})` : point.name;
}

/**
 * Parse NAVITIME sections into RoutingLegSteps with transitDetails.
 */
function parseSections(sections: NavitimeSection[]): RoutingLegStep[] {
  const steps: RoutingLegStep[] = [];

  // Sections alternate: point, move, point, move, ...
  // We need the surrounding points to get station names for transit moves.
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]!;
    if (section.type !== "move") continue;

    const move = section as NavitimeMoveSection;
    const durationSeconds = move.time * 60;
    const distanceMeters = move.distance;

    if (move.move === "walk") {
      steps.push({
        instruction: `Walk ${move.time} min (${move.distance}m)`,
        durationSeconds,
        distanceMeters,
        stepMode: "walk",
      });
      continue;
    }

    if (move.transport) {
      // Find surrounding point sections for station names
      const prevPoint = i > 0 ? sections[i - 1] : undefined;
      const nextPoint = i < sections.length - 1 ? sections[i + 1] : undefined;

      const departureStation =
        prevPoint?.type === "point" ? stationDisplayName(prevPoint, "departure") : undefined;
      const arrivalStation =
        nextPoint?.type === "point" ? stationDisplayName(nextPoint, "arrival") : undefined;

      // Count stops from links
      const numStops = move.transport.links?.length ?? undefined;

      // Headsign from first link destination
      const headsign = move.transport.links?.[0]?.destination?.name;

      steps.push({
        instruction: `${move.transport.name} · ${departureStation ?? "?"} → ${arrivalStation ?? "?"} · ${move.time} min`,
        durationSeconds,
        distanceMeters,
        stepMode: "transit",
        transitDetails: {
          lineName: move.transport.name,
          lineShortName: move.transport.links?.[0]?.name !== move.transport.name
            ? move.transport.links?.[0]?.name
            : undefined,
          vehicleType: mapVehicleType(move.transport.name),
          departureStop: departureStation,
          arrivalStop: arrivalStation,
          headsign,
          numStops,
        },
      });
    }
  }

  return steps;
}

/**
 * Resolve departure time to ISO 8601 for NAVITIME.
 * Accepts HH:MM (with optional timezone) or ISO string.
 */
function resolveStartTime(departureTime?: string, _timezone?: string): string {
  if (!departureTime) {
    // Default to "now" in JST
    const now = new Date();
    return now.toISOString().replace("Z", "+09:00");
  }

  // Already ISO format
  if (departureTime.includes("T") || departureTime.includes("-")) {
    return departureTime;
  }

  // HH:MM format - build a date in the future (tomorrow) to ensure valid transit schedules
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];
  return `${dateStr}T${departureTime}:00`;
}

export async function fetchNavitimeRoute(request: RoutingRequest): Promise<RoutingResult> {
  const { env } = await import("@/lib/env");
  const apiKey = env.navitimeRapidApiKey;

  if (!apiKey) {
    throw new Error("No NAVITIME API key configured. Set NAVITIME_RAPIDAPI_KEY.");
  }

  const startTime = resolveStartTime(request.departureTime, request.timezone);

  const params = new URLSearchParams({
    start: `${request.origin.lat},${request.origin.lng}`,
    goal: `${request.destination.lat},${request.destination.lng}`,
    start_time: startTime,
    limit: "1",
  });

  const url = `https://navitime-route-totalnavi.p.rapidapi.com/route_transit?${params}`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      "x-rapidapi-host": "navitime-route-totalnavi.p.rapidapi.com",
      "x-rapidapi-key": apiKey,
      "Content-Type": "application/json",
    },
  }, TIMEOUT_10_SECONDS);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`NAVITIME API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as NavitimeResponse;

  if (!data.items || data.items.length === 0) {
    throw new Error("NAVITIME returned no routes");
  }

  const route = data.items[0]!;
  const summary = route.summary.move;
  const steps = parseSections(route.sections);

  const leg: RoutingLeg = {
    mode: "transit",
    distanceMeters: summary.distance,
    durationSeconds: summary.time * 60,
    steps,
  };

  return {
    provider: "navitime",
    mode: request.mode,
    durationSeconds: summary.time * 60,
    distanceMeters: summary.distance,
    legs: [leg],
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  };
}
