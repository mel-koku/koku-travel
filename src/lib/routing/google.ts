import type { ItineraryTravelMode } from "@/types/itinerary";

import type { RoutingRequest, RoutingResult, RoutingLeg, RoutingLegStep } from "./types";

type DirectionsValue = {
  value: number;
  text?: string;
};

type DirectionsPolyline = {
  points?: string;
};

type DirectionsTransitDetails = {
  headsign?: string;
  num_stops?: number;
  line?: {
    name?: string;
    short_name?: string;
    vehicle?: {
      type?: string;
      name?: string;
    };
  };
};

type DirectionsStep = {
  distance?: DirectionsValue;
  duration?: DirectionsValue;
  html_instructions?: string;
  travel_mode?: string;
  polyline?: DirectionsPolyline;
  steps?: DirectionsStep[];
  transit_details?: DirectionsTransitDetails;
};

type DirectionsLeg = {
  distance?: DirectionsValue;
  duration?: DirectionsValue;
  steps?: DirectionsStep[];
};

type DirectionsRoute = {
  summary?: string;
  legs?: DirectionsLeg[];
  overview_polyline?: DirectionsPolyline;
  warnings?: string[];
};

type DirectionsResponse = {
  status?: string;
  error_message?: string;
  routes?: DirectionsRoute[];
};

const MODE_PARAM_MAP: Partial<Record<ItineraryTravelMode, string>> = {
  walk: "walking",
  bicycle: "bicycling",
  car: "driving",
  taxi: "driving",
  rideshare: "driving",
  transit: "transit",
  train: "transit",
  subway: "transit",
  tram: "transit",
  bus: "transit",
  ferry: "transit",
};

const TRANSIT_MODE_MAP: Partial<Record<ItineraryTravelMode, string>> = {
  train: "rail",
  subway: "subway",
  tram: "tram",
  bus: "bus",
  ferry: "ferry",
};

function decodePolyline(encoded?: string): RoutingLegStep["geometry"] {
  if (!encoded) {
    return undefined;
  }

  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates: { lat: number; lng: number }[] = [];

  while (index < len) {
    let result = 0;
    let shift = 0;
    let b: number;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return coordinates.length > 0 ? coordinates : undefined;
}

function stripHtml(html?: string): string | undefined {
  if (!html) {
    return undefined;
  }
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapTransitVehicleToMode(details?: DirectionsTransitDetails): ItineraryTravelMode {
  const type = details?.line?.vehicle?.type?.toUpperCase();
  switch (type) {
    case "HEAVY_RAIL":
    case "RAIL":
      return "train";
    case "SUBWAY":
    case "METRO_RAIL":
    case "HEAVY_METRO":
      return "subway";
    case "TRAM":
    case "LIGHT_RAIL":
    case "MONORAIL":
      return "tram";
    case "BUS":
    case "INTERCITY_BUS":
    case "TROLLEYBUS":
      return "bus";
    case "FERRY":
      return "ferry";
    default:
      return "transit";
  }
}

function mapStepMode(step: DirectionsStep, fallback: ItineraryTravelMode): ItineraryTravelMode {
  const travelMode = step.travel_mode?.toUpperCase();
  switch (travelMode) {
    case "WALKING":
      return "walk";
    case "BICYCLING":
      return "bicycle";
    case "DRIVING":
      return "car";
    case "TRANSIT":
      return mapTransitVehicleToMode(step.transit_details);
    default:
      return fallback;
  }
}

function mapSteps(steps: DirectionsStep[] | undefined, fallbackMode: ItineraryTravelMode): RoutingLegStep[] | undefined {
  if (!steps || steps.length === 0) {
    return undefined;
  }

  const mapped: RoutingLegStep[] = [];

  steps.forEach((step) => {
    const stepMode = mapStepMode(step, fallbackMode);

    if (step.steps && step.steps.length > 0) {
      const nested = mapSteps(step.steps, stepMode);
      if (nested) {
        mapped.push(...nested);
      }
      return;
    }

    const baseInstruction = stripHtml(step.html_instructions);
    const transitDetails = step.transit_details;
    let instruction = baseInstruction;

    if (transitDetails) {
      const parts: string[] = [];
      if (baseInstruction) {
        parts.push(baseInstruction);
      }
      const lineName = transitDetails.line?.short_name ?? transitDetails.line?.name;
      if (lineName) {
        parts.push(`Line ${lineName}`);
      }
      if (transitDetails.headsign) {
        parts.push(`toward ${transitDetails.headsign}`);
      }
      if (typeof transitDetails.num_stops === "number") {
        parts.push(`${transitDetails.num_stops} stops`);
      }
      instruction = parts.join(" · ");
    }

    mapped.push({
      instruction,
      distanceMeters: step.distance?.value,
      durationSeconds: step.duration?.value,
      geometry: decodePolyline(step.polyline?.points),
    });
  });

  return mapped.length > 0 ? mapped : undefined;
}

function mergeStepGeometries(steps?: RoutingLegStep[]): RoutingLegStep["geometry"] {
  if (!steps || steps.length === 0) {
    return undefined;
  }

  const coordinates: NonNullable<RoutingLegStep["geometry"]> = [];

  steps.forEach((step) => {
    if (!step.geometry || step.geometry.length === 0) {
      return;
    }
    step.geometry.forEach((point, index) => {
      if (!point) {
        return;
      }
      if (coordinates.length > 0) {
        const last = coordinates[coordinates.length - 1];
        if (last.lat === point.lat && last.lng === point.lng && index === 0) {
          return;
        }
      }
      coordinates.push({ lat: point.lat, lng: point.lng });
    });
  });

  return coordinates.length > 0 ? coordinates : undefined;
}

function resolveModeParam(mode: ItineraryTravelMode): string {
  return MODE_PARAM_MAP[mode] ?? "transit";
}

function resolveTransitModeParam(mode: ItineraryTravelMode): string | undefined {
  return TRANSIT_MODE_MAP[mode];
}

function resolveDepartureTime(value?: string, timezone?: string): string | null {
  if (!value) {
    return "now";
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return Math.floor(parsed / 1000).toString();
  }

  if (timezone && /^\d{1,2}:\d{2}$/.test(value)) {
    const [hours, minutes] = value.split(":").map((v) => Number.parseInt(v, 10));
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      const now = new Date();
      const localizedString = now.toLocaleString("en-US", { timeZone: timezone });
      const localizedDate = new Date(localizedString);
      localizedDate.setHours(hours, minutes, 0, 0);
      return Math.floor(localizedDate.getTime() / 1000).toString();
    }
  }

  return "now";
}

function buildLeg(
  leg: DirectionsLeg,
  fallbackMode: ItineraryTravelMode,
  summary?: string,
): RoutingLeg {
  const steps = mapSteps(leg.steps, fallbackMode);
  const geometry = mergeStepGeometries(steps);

  return {
    mode: fallbackMode,
    distanceMeters: leg.distance?.value ?? 0,
    durationSeconds: leg.duration?.value ?? 0,
    summary,
    steps,
    geometry,
  };
}

export async function fetchGoogleRoute(request: RoutingRequest): Promise<RoutingResult> {
  const apiKey = process.env.ROUTING_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_DIRECTIONS_API_KEY;

  if (!apiKey) {
    throw new Error("ROUTING_GOOGLE_MAPS_API_KEY is not configured.");
  }

  const modeParam = resolveModeParam(request.mode);
  const params = new URLSearchParams({
    origin: `${request.origin.lat},${request.origin.lng}`,
    destination: `${request.destination.lat},${request.destination.lng}`,
    mode: modeParam,
    key: apiKey,
  });

  if (modeParam === "transit") {
    const departureTime = resolveDepartureTime(request.departureTime, request.timezone);
    if (departureTime) {
      params.set("departure_time", departureTime);
    }
    const transitModeParam = resolveTransitModeParam(request.mode);
    if (transitModeParam) {
      params.set("transit_mode", transitModeParam);
    }
    params.set("transit_routing_preference", "fewer_transfers");
  }

  const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Directions API error (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as DirectionsResponse;

  if (payload.status !== "OK" || !payload.routes || payload.routes.length === 0) {
    throw new Error(
      `Google Directions API returned no routes: ${payload.status ?? "UNKNOWN"}${
        payload.error_message ? ` - ${payload.error_message}` : ""
      }`,
    );
  }

  const primaryRoute = payload.routes[0];
  const primaryLeg = primaryRoute.legs?.[0];

  if (!primaryLeg) {
    throw new Error("Google Directions API returned a route without legs.");
  }

  const legs: RoutingLeg[] = [
    buildLeg(primaryLeg, request.mode, primaryRoute.summary),
  ];

  const overviewGeometry = decodePolyline(primaryRoute.overview_polyline?.points) ?? mergeStepGeometries(legs[0].steps);

  const durationSeconds = primaryLeg.duration?.value ?? 0;
  const distanceMeters = primaryLeg.distance?.value ?? 0;

  const warnings = [...(primaryRoute.warnings ?? [])];

  const result: RoutingResult = {
    provider: "google",
    mode: request.mode,
    durationSeconds,
    distanceMeters,
    legs,
    warnings: warnings.length > 0 ? warnings : undefined,
    fetchedAt: new Date().toISOString(),
    geometry: overviewGeometry,
  };

  return result;
}


