import type { RoutingRequest, RoutingResult, RoutingLeg, RoutingLegStep } from "./types";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { TIMEOUT_10_SECONDS } from "@/lib/constants";
import { formatLocalDateISO } from "@/lib/utils/dateUtils";
import { env } from "@/lib/env";

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
    fare?: Record<string, number>;
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
 * Translate Japanese train type to English.
 */
function translateTrainType(type?: string): string | undefined {
  if (!type) return undefined;
  const map: Record<string, string> = {
    "普通": "Local",
    "快速": "Rapid",
    "特急": "Limited Express",
    "急行": "Express",
    "準急": "Semi-Express",
    "各停": "Local",
    "通勤快速": "Commuter Rapid",
    "新快速": "Special Rapid",
    "区間快速": "Section Rapid",
    "通勤特急": "Commuter Express",
  };
  return map[type] ?? type;
}

/**
 * Translate Japanese gateway/exit name to English.
 * Handles numbered exits (6番口 -> Exit 6) and directional exits (南口 -> South Exit).
 */
function translateGateway(gateway?: string): string | undefined {
  if (!gateway) return undefined;

  // Numbered exits: "6番口" -> "Exit 6", "A3口" -> "Exit A3"
  const numberedMatch = gateway.match(/^([A-Za-z]?\d+)番?口$/);
  if (numberedMatch) return `Exit ${numberedMatch[1]}`;

  // Letter+number exits: "A3" style
  const letterNumMatch = gateway.match(/^([A-Za-z]\d+)$/);
  if (letterNumMatch) return `Exit ${letterNumMatch[1]}`;

  const dirMap: Record<string, string> = {
    "北口": "North Exit",
    "南口": "South Exit",
    "東口": "East Exit",
    "西口": "West Exit",
    "中央口": "Central Exit",
    "中央北口": "Central North Exit",
    "中央南口": "Central South Exit",
    "中央東口": "Central East Exit",
    "中央西口": "Central West Exit",
    "正面口": "Main Exit",
    "表口": "Front Exit",
    "裏口": "Rear Exit",
    "新南口": "New South Exit",
    "新北口": "New North Exit",
    "八重洲口": "Yaesu Exit",
    "八重洲中央口": "Yaesu Central Exit",
    "八重洲北口": "Yaesu North Exit",
    "八重洲南口": "Yaesu South Exit",
    "丸の内口": "Marunouchi Exit",
    "丸の内中央口": "Marunouchi Central Exit",
    "丸の内北口": "Marunouchi North Exit",
    "丸の内南口": "Marunouchi South Exit",
    "日本橋口": "Nihonbashi Exit",
    "京王口": "Keio Exit",
    "小田急口": "Odakyu Exit",
    "銀座口": "Ginza Exit",
    "乗換口": "Transfer Gate",
  };
  return dirMap[gateway] ?? gateway;
}

/**
 * Translate Japanese car position hint to English.
 * NAVITIME returns "前" (front), "中" (middle), "後" (rear), or combos like "中・後".
 */
function translateCarPosition(getoff?: string): string | undefined {
  if (!getoff) return undefined;

  // Pure number means car number
  if (/^\d+$/.test(getoff)) return `Car ${getoff}`;

  const map: Record<string, string> = {
    "前": "Front",
    "中": "Middle",
    "後": "Rear",
    "前・中": "Front/Middle",
    "中・後": "Middle/Rear",
    "前・後": "Front/Rear",
  };
  return map[getoff] ?? getoff;
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

      // Extract gateway (exit/entrance) from surrounding station points
      const departureGateway = prevPoint?.type === "point"
        ? translateGateway(prevPoint.gateway)
        : undefined;
      const arrivalGateway = nextPoint?.type === "point"
        ? translateGateway(nextPoint.gateway)
        : undefined;

      // Base fare (unit_0 = single adult fare in yen)
      const fareYen = move.transport.fare?.unit_0;

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
          lineColor: move.transport.color,
          trainType: translateTrainType(move.transport.type),
          carPosition: translateCarPosition(move.transport.getoff),
          departureGateway,
          arrivalGateway,
          fareYen,
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
  const dateStr = formatLocalDateISO(tomorrow);
  return `${dateStr}T${departureTime}:00`;
}

export async function fetchNavitimeRoute(request: RoutingRequest): Promise<RoutingResult> {
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
