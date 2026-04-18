import { estimateHeuristicRoute } from "./heuristic";
import { fetchGoogleRoute } from "./google";
import { fetchMapboxRoute } from "./mapbox";
import { fetchNavitimeRoute } from "./navitime";
import { getCachedRoute, setCachedRoute } from "./cache";
import type { RoutingRequest, RoutingResult, RoutingProviderName, RoutingFetchFn } from "./types";
import { toRoutingMode } from "./types";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

type ProviderConfig = {
  name: RoutingProviderName;
  handler: RoutingFetchFn;
  isEnabled: () => boolean;
};

const PROVIDERS: ProviderConfig[] = [
  {
    name: "navitime",
    handler: fetchNavitimeRoute,
    isEnabled: () => Boolean(process.env.NAVITIME_RAPIDAPI_KEY),
  },
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
  // Prefer NAVITIME for transit (Japan-native data), fall back to Google
  if (mode === "transit") {
    const navitime = PROVIDERS.find((p) => p.name === "navitime");
    if (navitime?.isEnabled()) return navitime;
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

// Timeout wrapper for routing requests (8 seconds max).
//
// Tuning note: the underlying Mapbox/Google/NAVITIME clients use ~10s internal
// timeouts. At 5s, the wrapper fired the heuristic fallback before the provider
// could respond on normal but slow requests, leaving users with vibes-based
// ETAs on perfectly working routes. 8s lets real routing answers arrive while
// still bounding the worst case well under the 60s route maxDuration.
const ROUTING_TIMEOUT_MS = 8000;

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
    if (process.env.NODE_ENV === "development") {
      logger.debug(`[Routing] Using provider "${provider.name}" for mode "${routingMode}"`);
    }
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
    if (process.env.NODE_ENV === "development") {
      logger.error(`[Routing] ${provider.name} failed`, error instanceof Error ? error : new Error(String(error)));
    }
    const fallback = estimateHeuristicRoute(request);
    fallback.warnings = [
      ...(fallback.warnings ?? []),
      `Fell back to heuristic estimate after ${provider.name} error: ${(error as Error).message}`,
    ];
    // Don't cache error fallbacks -- the provider may recover on next attempt
    return fallback;
  }
}

export { getCachedRoute, setCachedRoute, clearRoutingCache } from "./cache";
export type { RoutingRequest, RoutingResult, RoutingProviderName, Coordinate } from "./types";


