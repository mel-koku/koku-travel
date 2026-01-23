import { type RoutingRequest, type RoutingResult, type RoutingLegStep } from "./types";
import { env } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { TIMEOUT_10_SECONDS } from "@/lib/constants";

type MapboxProfile = "driving" | "driving-traffic" | "walking" | "cycling";

const MODE_PROFILE_MAP: Record<string, MapboxProfile> = {
  // Internal travel modes
  walk: "walking",
  bicycle: "cycling",
  car: "driving",
  taxi: "driving-traffic",
  rideshare: "driving-traffic",
  transit: "driving",
  train: "driving",
  subway: "driving",
  tram: "driving",
  bus: "driving",
  ferry: "driving",
  subwayline: "driving",
  // Standard routing modes (for translated API requests)
  walking: "walking",
  driving: "driving",
  cycling: "cycling",
};

function resolveProfile(mode: RoutingRequest["mode"]): {
  profile: MapboxProfile;
  warnings: string[];
} {
  const normalized = mode.toLowerCase();
  const profile = MODE_PROFILE_MAP[normalized] ?? "driving";
  const warnings: string[] = [];

  if (["train", "subway", "tram", "bus", "ferry", "transit"].includes(normalized)) {
    warnings.push("Mapbox Directions lacks full transit support; using road travel approximation.");
  }

  return { profile, warnings };
}

function normalizeDepartureTime(value: string): string | null {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    return null;
  }
  return null;
}

function buildUrl(request: RoutingRequest, accessToken: string, profile: MapboxProfile): {
  url: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const coordinates = [
    `${request.origin.lng},${request.origin.lat}`,
    `${request.destination.lng},${request.destination.lat}`,
  ].join(";");

  const params = new URLSearchParams({
    alternatives: "false",
    steps: "true",
    overview: "full",
    geometries: "geojson",
    access_token: accessToken,
  });

  if (request.departureTime) {
    const normalized = normalizeDepartureTime(request.departureTime);
    if (normalized) {
      params.set("depart_at", normalized);
    } else {
      warnings.push(
        "Ignored departureTime when calling Mapbox because it was not an ISO 8601 timestamp.",
      );
    }
  }

  return {
    url: `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?${params.toString()}`,
    warnings,
  };
}

type MapboxStep = {
  duration: number;
  distance: number;
  maneuver?: {
    instruction?: string;
  };
  geometry?: {
    type: string;
    coordinates?: [number, number][];
  };
};

type MapboxLeg = {
  summary: string;
  duration: number;
  distance: number;
  steps?: MapboxStep[];
  annotation?: {
    congestion?: string[];
  };
};

type MapboxRoute = {
  duration: number;
  distance: number;
  legs: MapboxLeg[];
  geometry?: {
    type: string;
    coordinates?: [number, number][];
  };
};

type MapboxResponse = {
  routes?: MapboxRoute[];
  code?: string;
  message?: string;
};

function toCoordinateList(tuples?: [number, number][]): RoutingLegStep["geometry"] {
  if (!tuples || tuples.length === 0) {
    return undefined;
  }
  return tuples.map(([lng, lat]) => ({ lat, lng }));
}

function mapSteps(steps?: MapboxStep[]): RoutingLegStep[] | undefined {
  if (!steps) {
    return undefined;
  }
  return steps.map((step) => ({
    instruction: step.maneuver?.instruction,
    distanceMeters: step.distance,
    durationSeconds: step.duration,
    geometry: toCoordinateList(step.geometry?.coordinates),
  }));
}

function mergeStepGeometries(steps?: RoutingLegStep[]): RoutingLegStep["geometry"] {
  if (!steps || steps.length === 0) {
    return undefined;
  }

  const coordinates: RoutingLegStep["geometry"] = [];

  steps.forEach((step) => {
    if (!step.geometry || step.geometry.length === 0) {
      return;
    }

    step.geometry.forEach((point, index) => {
      if (!point) return;
      if (coordinates.length > 0) {
        const last = coordinates[coordinates.length - 1];
        if (last && last.lat === point.lat && last.lng === point.lng && index === 0) {
          return;
        }
      }
      coordinates.push({ lat: point.lat, lng: point.lng });
    });
  });

  return coordinates.length > 0 ? coordinates : undefined;
}

export async function fetchMapboxRoute(request: RoutingRequest): Promise<RoutingResult> {
  const accessToken = env.routingMapboxAccessToken;
  if (!accessToken) {
    throw new Error("ROUTING_MAPBOX_ACCESS_TOKEN is not configured.");
  }

  const { profile, warnings } = resolveProfile(request.mode);
  const { url, warnings: urlWarnings } = buildUrl(request, accessToken, profile);

  const response = await fetchWithTimeout(url, {}, TIMEOUT_10_SECONDS);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mapbox Directions error (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as MapboxResponse;

  if (!payload.routes || payload.routes.length === 0) {
    throw new Error("Mapbox Directions returned no routes.");
  }

  const primaryRoute = payload.routes[0];
  if (!primaryRoute) {
    throw new Error("Mapbox Directions API returned no routes.");
  }
  const legs =
    primaryRoute.legs?.map((leg) => {
      const mappedSteps = mapSteps(leg.steps);
      return {
        mode: request.mode,
        distanceMeters: leg.distance,
        durationSeconds: leg.duration,
        summary: leg.summary,
        steps: mappedSteps,
        geometry: mergeStepGeometries(mappedSteps),
      };
    }) ?? [];

  const primaryGeometry =
    toCoordinateList(primaryRoute.geometry?.coordinates) ??
    mergeStepGeometries(legs.flatMap((leg) => leg.steps ?? []));

  const result: RoutingResult = {
    provider: "mapbox",
    mode: request.mode,
    durationSeconds: primaryRoute.duration,
    distanceMeters: primaryRoute.distance,
    legs,
    warnings: [...warnings, ...urlWarnings],
    fetchedAt: new Date().toISOString(),
    geometry: primaryGeometry,
  };

  if (!result.warnings?.length) {
    delete result.warnings;
  }

  return result;
}


