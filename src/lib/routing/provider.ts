import { estimateHeuristicRoute } from "./heuristic";
import { fetchGoogleRoute } from "./google";
import { fetchMapboxRoute } from "./mapbox";
import { getCachedRoute, setCachedRoute } from "./cache";
import type { RoutingRequest, RoutingResult, RoutingProviderName, RoutingFetchFn } from "./types";
import { toRoutingMode } from "./types";
import { env } from "@/lib/env";

type ProviderConfig = {
  name: RoutingProviderName;
  handler: RoutingFetchFn;
  isEnabled: () => boolean;
};

const PROVIDERS: ProviderConfig[] = [
  {
    name: "mapbox",
    handler: fetchMapboxRoute,
    isEnabled: () => Boolean(process.env.ROUTING_MAPBOX_ACCESS_TOKEN),
  },
  {
    name: "google",
    handler: fetchGoogleRoute,
    isEnabled: () =>
      Boolean(
        process.env.ROUTING_GOOGLE_MAPS_API_KEY ??
          process.env.GOOGLE_DIRECTIONS_API_KEY ??
          process.env.GOOGLE_PLACES_API_KEY
      ),
  },
];

function resolveProvider(mode?: string): ProviderConfig | null {
  // Always prefer Google for transit — Mapbox lacks transit support entirely
  if (mode === "transit") {
    const google = PROVIDERS.find((p) => p.name === "google");
    if (google?.isEnabled()) return google;
  }

  const envPreference = (process.env.ROUTING_PROVIDER ?? "").toLowerCase();
  if (envPreference) {
    const preferred = PROVIDERS.find((provider) => provider.name === envPreference);
    if (preferred && preferred.isEnabled()) {
      return preferred;
    }
  }

  return PROVIDERS.find((provider) => provider.isEnabled()) ?? null;
}

// Timeout wrapper for routing requests (5 seconds max)
const ROUTING_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: () => T): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback()), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

export async function requestRoute(request: RoutingRequest): Promise<RoutingResult> {
  const cached = getCachedRoute(request);
  if (cached) {
    return cached;
  }

  if (env.isCheapMode) {
    const heuristic = estimateHeuristicRoute(request);
    setCachedRoute(request, heuristic);
    return heuristic;
  }

  const routingMode = toRoutingMode(request.mode as import("@/types/itinerary").ItineraryTravelMode);
  const provider = resolveProvider(routingMode);

  if (!provider) {
    const heuristic = estimateHeuristicRoute(request);
    setCachedRoute(request, heuristic);
    return heuristic;
  }

  try {
    // Add timeout to prevent hanging on slow API responses
    const result = await withTimeout(
      provider.handler(request),
      ROUTING_TIMEOUT_MS,
      () => {
        const fallback = estimateHeuristicRoute(request);
        fallback.warnings = [
          ...(fallback.warnings ?? []),
          `Routing timed out after ${ROUTING_TIMEOUT_MS}ms, using heuristic estimate`,
        ];
        return fallback;
      },
    );
    setCachedRoute(request, result);
    return result;
  } catch (error) {
    const fallback = estimateHeuristicRoute(request);
    fallback.warnings = [
      ...(fallback.warnings ?? []),
      `Fell back to heuristic estimate after ${provider.name} error: ${(error as Error).message}`,
    ];
    setCachedRoute(request, fallback);
    return fallback;
  }
}

export { getCachedRoute, setCachedRoute, clearRoutingCache } from "./cache";
export type { RoutingRequest, RoutingResult, RoutingProviderName, Coordinate } from "./types";


