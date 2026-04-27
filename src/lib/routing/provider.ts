import { estimateHeuristicRoute, haversineDistance } from "./heuristic";
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

// Distance below which a "transit" request landing on a walk-only response is
// legitimate (the destination is genuinely walkable). Above this, a walk-only
// response from a transit provider is treated as a soft-fail and triggers a
// retry against the next-priority transit provider. 1km mirrors the planner's
// TRANSIT_DISTANCE_THRESHOLD_KM gate (the planner only requests transit at
// or above 1km), so the retry envelope matches the planner's intent.
const TRANSIT_FAILOVER_MIN_DISTANCE_M = 1000;

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

/**
 * True when a transit-mode routing result has no transit steps anywhere in
 * its legs. This indicates the provider couldn't compute a real transit route
 * (e.g. NAVITIME returned all-walk sections, or no rail/bus lines exist
 * between the coords at the requested time). Used to decide whether to
 * retry with the next-priority transit provider.
 *
 * Non-transit results (walk, drive, cycle requests) never count as soft-fail.
 */
export function isTransitSoftFail(result: RoutingResult): boolean {
  if (result.mode !== "transit" && result.mode !== "train" && result.mode !== "subway") {
    return false;
  }
  return !result.legs.some((leg) =>
    leg.steps?.some((step) => step.stepMode === "transit"),
  );
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

    // Transit soft-fail retry: when NAVITIME succeeds but returns no transit
    // steps for a request that is far enough to require transit (e.g. it
    // returned all-walk sections), retry with Google. Without this, the
    // planner downstream sees `hasTransitSteps === false`, falls back to the
    // walk Phase 1 result, and a 70km airport→hotel can advance the day
    // cursor by 14 hours of fictional walking. CLAUDE.md describes the
    // chain as "NAVITIME → Mapbox → Google → heuristic" but historically
    // that was provider *selection* priority, not runtime failover.
    const retryResult = await maybeRetryTransitWithGoogle(request, provider.name, result, routingMode);
    if (retryResult) {
      setCachedRoute(request, retryResult);
      return retryResult;
    }

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

/**
 * When NAVITIME returns a transit response with no transit steps and the
 * straight-line distance is past the transit threshold, retry with Google
 * Directions. Returns the Google result on success, or `null` to signal the
 * caller should keep the original NAVITIME result.
 */
async function maybeRetryTransitWithGoogle(
  request: RoutingRequest,
  primaryProvider: RoutingProviderName,
  primaryResult: RoutingResult,
  routingMode: string,
): Promise<RoutingResult | null> {
  if (routingMode !== "transit") return null;
  if (primaryProvider !== "navitime") return null;
  if (!isTransitSoftFail(primaryResult)) return null;

  const distanceM = haversineDistance(request.origin, request.destination);
  if (distanceM < TRANSIT_FAILOVER_MIN_DISTANCE_M) return null;

  const google = PROVIDERS.find((p) => p.name === "google");
  if (!google?.isEnabled()) return null;

  logger.warn("[Routing] NAVITIME returned no transit steps; retrying with Google", {
    distanceM: Math.round(distanceM),
    origin: request.origin,
    destination: request.destination,
  });

  try {
    const googleResult = await withTimeout(
      google.handler(request),
      ROUTING_TIMEOUT_MS,
      () => primaryResult, // on timeout, keep NAVITIME's response
    );
    if (googleResult === primaryResult) {
      // withTimeout's fallback fired — Google didn't return in time.
      logger.warn("[Routing] Google transit retry timed out; keeping NAVITIME response");
      return null;
    }
    if (isTransitSoftFail(googleResult)) {
      logger.warn("[Routing] Google also returned no transit steps; keeping NAVITIME response");
      return null;
    }
    // Use `warn` (not `info`) — this is still an anomaly path. Pairs
    // symmetrically with the `warn` we emit at the start of the retry, so
    // grepping logs for "[Routing]" gives a complete soft-fail picture.
    logger.warn("[Routing] Google transit retry succeeded");
    return googleResult;
  } catch (error) {
    logger.warn("[Routing] Google transit retry failed; keeping NAVITIME response", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export { getCachedRoute, setCachedRoute, clearRoutingCache } from "./cache";
export type { RoutingRequest, RoutingResult, RoutingProviderName, Coordinate } from "./types";


