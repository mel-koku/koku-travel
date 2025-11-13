import { estimateHeuristicRoute } from "./heuristic";
import { fetchGoogleRoute } from "./google";
import { fetchMapboxRoute } from "./mapbox";
import { getCachedRoute, setCachedRoute } from "./cache";
import type { RoutingRequest, RoutingResult, RoutingProviderName, RoutingFetchFn } from "./types";

type ProviderConfig = {
  name: RoutingProviderName;
  handler: RoutingFetchFn;
  isEnabled: () => boolean;
};

const PROVIDERS: ProviderConfig[] = [
  {
    name: "google",
    handler: fetchGoogleRoute,
    isEnabled: () =>
      Boolean(process.env.ROUTING_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_DIRECTIONS_API_KEY),
  },
  {
    name: "mapbox",
    handler: fetchMapboxRoute,
    isEnabled: () => Boolean(process.env.ROUTING_MAPBOX_ACCESS_TOKEN),
  },
];

function resolveProvider(): ProviderConfig | null {
  const envPreference = (process.env.ROUTING_PROVIDER ?? "").toLowerCase();
  if (envPreference) {
    const preferred = PROVIDERS.find((provider) => provider.name === envPreference);
    if (preferred && preferred.isEnabled()) {
      return preferred;
    }
  }

  return PROVIDERS.find((provider) => provider.isEnabled()) ?? null;
}

export async function requestRoute(request: RoutingRequest): Promise<RoutingResult> {
  const cached = getCachedRoute(request);
  if (cached) {
    return cached;
  }

  const provider = resolveProvider();

  if (!provider) {
    const heuristic = estimateHeuristicRoute(request);
    setCachedRoute(request, heuristic);
    return heuristic;
  }

  try {
    const result = await provider.handler(request);
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


